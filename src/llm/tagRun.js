/**
 * 给已入库中标打 AI 标签。只写 announcement_ai 与 award_packages。
 */
import { getLlmSettings } from '../admin/llmRepo.js';
import { chatCompletionsUrl } from './settings.js';
import { buildAwardTagPrompt, messageText, packagesFromPayload, parseModelJson } from './tagAward.js';

export async function completeChat(settings, prompt, { fetchImpl = fetch, timeoutMs = 180000 } = {}) {
  const url = chatCompletionsUrl(settings.baseUrl);
  const body = {
    model: settings.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 2000,
    reasoning_effort: settings.reasoning === 'on' ? 'low' : 'none',
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`网关返回 ${res.status}`);
    return messageText(JSON.parse(text));
  } catch (err) {
    if (err?.name === 'AbortError' || /aborted/i.test(err?.message || '')) {
      throw new Error('模型响应超时');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function listUntaggedAwards(pool, { from, to, limit }) {
  const res = await pool.query(
    `SELECT a.id, a.title, a.purchaser, a.district_name, a.project_name, a.project_code,
            a.award_amount, a.supplier, a.content_text
     FROM announcements a
     LEFT JOIN announcement_ai ai ON ai.announcement_id = a.id AND ai.status IN ('done', 'skipped')
     WHERE a.type = 'award'
       AND a.detail_status = 'done'
       AND a.publish_time >= $1::timestamptz
       AND a.publish_time < $2::timestamptz
       AND ai.id IS NULL
     ORDER BY a.publish_time, a.id
     LIMIT $3`,
    [`${from} 00:00:00+08`, `${to} 00:00:00+08`, limit]
  );
  return res.rows;
}

async function saveFailure(pool, announcementId, model, error) {
  await pool.query(
    `INSERT INTO announcement_ai (announcement_id, payload, status, model, error, tagged_at)
     VALUES ($1, NULL, 'failed', $2, $3, now())
     ON CONFLICT (announcement_id) DO UPDATE SET
       payload = NULL, status = 'failed', model = EXCLUDED.model, error = EXCLUDED.error, tagged_at = now()`,
    [announcementId, model, error]
  );
  await pool.query(`DELETE FROM award_packages WHERE announcement_id = $1`, [announcementId]);
}

async function saveSuccess(pool, announcementId, model, payload) {
  const packages = packagesFromPayload(payload);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO announcement_ai (announcement_id, payload, status, model, error, tagged_at)
       VALUES ($1, $2::jsonb, 'done', $3, NULL, now())
       ON CONFLICT (announcement_id) DO UPDATE SET
         payload = EXCLUDED.payload, status = 'done', model = EXCLUDED.model, error = NULL, tagged_at = now()`,
      [announcementId, JSON.stringify(payload), model]
    );
    await client.query(`DELETE FROM award_packages WHERE announcement_id = $1`, [announcementId]);
    for (const pkg of packages) {
      await client.query(
        `INSERT INTO award_packages
           (announcement_id, item_index, item_name, supplier_name, deal_amount, industry, content_tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [
          announcementId,
          pkg.item_index,
          pkg.item_name,
          pkg.supplier_name,
          pkg.deal_amount,
          pkg.industry,
          JSON.stringify(pkg.content_tags),
        ]
      );
    }
    await client.query('COMMIT');
    return packages.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** 同一进程内同时打标的条数。不要再开第二个进程。 */
export const TAG_CONCURRENCY = 3;

/** 最多 limit 个任务同时进行，结果顺序与输入一致。 */
export async function mapPool(items, limit, fn) {
  const list = items || [];
  const results = new Array(list.length);
  let next = 0;
  const workers = Math.min(Math.max(1, limit), list.length);
  if (workers === 0) return results;
  async function worker() {
    while (next < list.length) {
      const i = next++;
      results[i] = await fn(list[i], i);
    }
  }
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

export async function tagAwardRows(pool, rows, { fetchImpl, concurrency = TAG_CONCURRENCY } = {}) {
  const settings = await getLlmSettings(pool);
  if (!settings.apiKey) throw new Error('未配置 api_key');
  return mapPool(rows, concurrency, async (row) => {
    try {
      const prompt = buildAwardTagPrompt(row);
      const text = await completeChat(settings, prompt, { fetchImpl });
      const payload = parseModelJson(text);
      const packageCount = await saveSuccess(pool, row.id, settings.model, payload);
      console.log(`tagged ${row.id} packages=${packageCount} ${row.title}`);
      return { id: row.id, status: 'done', packageCount };
    } catch (err) {
      await saveFailure(pool, row.id, settings.model, err.message);
      console.error(`tag failed ${row.id}: ${err.message}`);
      return { id: row.id, status: 'failed', error: err.message };
    }
  });
}
