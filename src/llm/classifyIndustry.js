/**
 * 只补行业和内容标签。不改供应商、成交金额和包件行。
 */
import { MAIN_INDUSTRIES, SUB_INDUSTRIES, assertMainIndustry, cleanLabelList } from './industries.js';

export const CLASSIFY_MAX_TOKENS = 600;

/** 19:40–21:00 不调用模型，把网关留给每天 20:00 的打标。 */
export function inGatewayQuiet(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour').value);
  const minute = Number(parts.find((part) => part.type === 'minute').value);
  const mins = hour * 60 + minute;
  return mins >= 19 * 60 + 40 && mins < 21 * 60;
}

export function buildIndustryClassifyPrompt(row) {
  const items = Array.isArray(row.items) ? row.items : [];
  const lines = items.slice(0, 30).map((item, index) => `${index + 1}. ${item.item_name || ''}`);
  const extra = items.length > 30 ? `\n其余 ${items.length - 30} 个包件略` : '';
  return `你是政府采购行业分类员。只根据标题和包件名称归类，不虚构。
主行业只能从这些词里选一个：${MAIN_INDUSTRIES.join('、')}。归不进前面的类就写「其他」。不要写「未明确」，不要写国民经济行业分类。
二级行业只在下列词语里选择，可以空着：${SUB_INDUSTRIES.join('、')}。
内容标签写 1 到 5 个采购物的短名称，从包件名称抽取，不要写句子。
只输出一个 JSON 对象：{"main_industry":"","sub_industry":[],"purchase_content_tags":[]}

标题：${row.title || ''}
采购人：${row.purchaser || ''}
包件：
${lines.join('\n')}${extra}`;
}

export function parseIndustryResult(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('模型没有返回 JSON');
  const payload = JSON.parse(candidate.slice(start, end + 1));
  return {
    main_industry: assertMainIndustry(payload.main_industry),
    sub_industry: cleanLabelList(payload.sub_industry, { allowed: SUB_INDUSTRIES }),
    purchase_content_tags: cleanLabelList(payload.purchase_content_tags),
  };
}

export const LIST_INDUSTRY_SQL = `
  SELECT a.id, a.title, a.purchaser,
         COALESCE(json_agg(json_build_object(
           'item_index', p.item_index,
           'item_name', p.item_name
         ) ORDER BY p.item_index NULLS LAST, p.id) FILTER (WHERE p.id IS NOT NULL), '[]'::json) AS items
  FROM announcements a
  JOIN announcement_ai ai ON ai.announcement_id = a.id AND ai.status = 'done'
  JOIN award_packages p ON p.announcement_id = a.id
  WHERE coalesce(ai.payload->'industry_classify'->>'status', '') <> 'failed'
    AND EXISTS (
      SELECT 1 FROM award_packages x
      WHERE x.announcement_id = a.id
        AND (x.industry IS NULL OR x.industry = '未明确' OR NOT (x.industry = ANY($1::text[])))
    )
  GROUP BY a.id, a.title, a.purchaser, a.publish_time
  ORDER BY a.publish_time, a.id
  LIMIT $2`;

export const APPLY_INDUSTRY_SQL = `
  UPDATE award_packages
  SET industry = $1,
      content_tags = CASE
        WHEN jsonb_array_length($2::jsonb) > 0 THEN $2::jsonb
        ELSE content_tags
      END
  WHERE announcement_id = $3`;

export const APPLY_PAYLOAD_SQL = `
  UPDATE announcement_ai
  SET payload = jsonb_set(
        jsonb_set(payload, '{industry}', $1::jsonb, true),
        '{purchase_content_tags}',
        $2::jsonb,
        true
      ) - 'industry_classify'
  WHERE announcement_id = $3 AND status = 'done'`;

export async function listIndustryTargets(pool, limit) {
  const res = await pool.query(LIST_INDUSTRY_SQL, [MAIN_INDUSTRIES, limit]);
  return res.rows;
}

export async function applyIndustryResult(pool, id, result) {
  const industry = JSON.stringify({
    main_industry: result.main_industry,
    sub_industry: result.sub_industry,
  });
  const tags = JSON.stringify(result.purchase_content_tags);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(APPLY_PAYLOAD_SQL, [industry, tags, id]);
    await client.query(APPLY_INDUSTRY_SQL, [result.main_industry, tags, id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function markIndustryFailed(pool, id, message) {
  await pool.query(
    `UPDATE announcement_ai
     SET payload = jsonb_set(
       payload,
       '{industry_classify}',
       $1::jsonb,
       true
     )
     WHERE announcement_id = $2 AND status = 'done'`,
    [JSON.stringify({ status: 'failed', error: String(message || '').slice(0, 200) }), id]
  );
}
