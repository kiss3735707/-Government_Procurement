/**
 * 采集入库：列表 ON CONFLICT DO NOTHING；详情 UPDATE；failed 下次再抓。
 */
import { SITE } from '../config.js';
import { getPool } from './pool.js';
import { RETRY_STATUSES } from './status.js';
import { asJsonb, nextProjectStage } from './map.js';

export const INSERT_ANNOUNCEMENT_SQL = `
INSERT INTO announcements (
  site_code, article_id, category_code, type, type_detail,
  title, purchaser, publisher, district_name, district_code,
  publish_time, expired_at, detail_status, raw_json
) VALUES (
  $1,$2,$3,$4,$5,
  $6,$7,$8,$9,$10,
  $11,$12,$13,$14::jsonb
)
ON CONFLICT (site_code, article_id) DO NOTHING
RETURNING id
`;

/**
 * @returns {{ id: number, inserted: boolean, detail_status: string }}
 */
export async function insertAnnouncementList(row, client = getPool()) {
  const ins = await client.query(INSERT_ANNOUNCEMENT_SQL, [
    row.site_code,
    row.article_id,
    row.category_code,
    row.type,
    row.type_detail,
    row.title,
    row.purchaser,
    row.publisher,
    row.district_name,
    row.district_code,
    row.publish_time,
    row.expired_at,
    row.detail_status,
    row.raw_json == null ? null : JSON.stringify(asJsonb(row.raw_json)),
  ]);
  if (ins.rowCount > 0) {
    return { id: ins.rows[0].id, inserted: true, detail_status: row.detail_status };
  }
  const sel = await client.query(
    `SELECT id, detail_status FROM announcements WHERE site_code = $1 AND article_id = $2`,
    [row.site_code, row.article_id]
  );
  const existing = sel.rows[0];
  return { id: existing.id, inserted: false, detail_status: existing.detail_status };
}

export async function updateAnnouncementDetail(id, patch, status, client = getPool()) {
  await client.query(
    `UPDATE announcements SET
      project_code = $2,
      project_name = $3,
      bid_open_time = $4,
      fund_source = $5,
      budget_amount = $6,
      award_amount = $7,
      supplier = $8,
      content_html = $9,
      content_text = $10,
      attachment_info = $11::jsonb,
      track_links = $12::jsonb,
      tags = $13::jsonb,
      raw_json = $14::jsonb,
      detail_status = $15
    WHERE id = $1`,
    [
      id,
      patch.project_code,
      patch.project_name,
      patch.bid_open_time,
      patch.fund_source,
      patch.budget_amount,
      patch.award_amount,
      patch.supplier,
      patch.content_html,
      patch.content_text,
      patch.attachment_info == null ? null : JSON.stringify(asJsonb(patch.attachment_info)),
      patch.track_links == null ? null : JSON.stringify(asJsonb(patch.track_links)),
      JSON.stringify(asJsonb(patch.tags ?? {})),
      patch.raw_json == null ? null : JSON.stringify(asJsonb(patch.raw_json)),
      status,
    ]
  );
}

export async function markDetailFailed(id, rawJson, client = getPool()) {
  await client.query(
    `UPDATE announcements SET detail_status = 'failed', raw_json = COALESCE($2, raw_json)
     WHERE id = $1`,
    [id, rawJson == null ? null : JSON.stringify(asJsonb(rawJson))]
  );
}

export async function replaceIntentionItems(announcementId, items, client = getPool()) {
  await client.query(`DELETE FROM intention_items WHERE announcement_id = $1`, [announcementId]);
  for (const it of items) {
    if (!it.item_name) continue;
    await client.query(
      `INSERT INTO intention_items
        (announcement_id, seq_no, item_name, item_summary, budget_amount, expect_month, remark)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        announcementId,
        it.seq_no,
        it.item_name,
        it.item_summary,
        it.budget_amount,
        it.expect_month,
        it.remark,
      ]
    );
  }
}

export async function upsertProject(row, incomingStage, client = getPool()) {
  if (!row.project_code) return;
  const sel = await client.query(`SELECT stage FROM projects WHERE project_code = $1`, [
    row.project_code,
  ]);
  const stage = nextProjectStage(sel.rows[0]?.stage, incomingStage);
  await client.query(
    `INSERT INTO projects (
      project_code, project_name, purchaser, last_seen, stage, budget_amount, award_amount, winner
    ) VALUES ($1,$2,$3, now(), $4, $5, $6, $7)
    ON CONFLICT (project_code) DO UPDATE SET
      project_name = COALESCE(EXCLUDED.project_name, projects.project_name),
      purchaser = COALESCE(EXCLUDED.purchaser, projects.purchaser),
      last_seen = EXCLUDED.last_seen,
      stage = EXCLUDED.stage,
      budget_amount = COALESCE(EXCLUDED.budget_amount, projects.budget_amount),
      award_amount = COALESCE(EXCLUDED.award_amount, projects.award_amount),
      winner = COALESCE(EXCLUDED.winner, projects.winner)`,
    [
      row.project_code,
      row.project_name,
      row.purchaser,
      stage,
      row.budget_amount,
      row.award_amount,
      row.supplier,
    ]
  );
}

export async function listRetryQueue(categoryCode, client = getPool()) {
  const res = await client.query(
    `SELECT id, site_code, article_id, category_code, type, title, purchaser,
            publisher, district_name, publish_time, raw_json, detail_status
     FROM announcements
     WHERE site_code = $1
       AND category_code = $2
       AND detail_status = ANY($3::text[])
     ORDER BY publish_time DESC`,
    [SITE.code, categoryCode, RETRY_STATUSES]
  );
  return res.rows;
}

export async function startCollectRun({ runDate, category }, client = getPool()) {
  const res = await client.query(
    `INSERT INTO collect_runs (run_date, site_code, category, status, started_at)
     VALUES ($1, $2, $3, 'running', now())
     RETURNING id`,
    [runDate, SITE.code, category]
  );
  return res.rows[0].id;
}

export async function finishCollectRun(id, stats, client = getPool()) {
  await client.query(
    `UPDATE collect_runs SET
      page_count = $2,
      fetched_cnt = $3,
      inserted_cnt = $4,
      detail_ok_cnt = $5,
      status = $6,
      error = $7,
      finished_at = now()
     WHERE id = $1`,
    [
      id,
      stats.page_count ?? null,
      stats.fetched_cnt ?? null,
      stats.inserted_cnt ?? null,
      stats.detail_ok_cnt ?? null,
      stats.status,
      stats.error ?? null,
    ]
  );
}
