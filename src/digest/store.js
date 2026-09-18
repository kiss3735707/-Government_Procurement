import { DISTRICT_CODES } from '../normalize/district.js';
import { getPool } from '../db/pool.js';
import { standardRegion, UNASSIGNED_REGION } from './match.js';

export async function importSalesRows(rows, client = getPool()) {
  let n = 0;
  for (const r of rows) {
    const region = standardRegion(r.region) || r.region;
    const code = DISTRICT_CODES[region] || null;
    await client.query(
      `INSERT INTO sales_regions (sales_name, sales_email, region, region_code, note, is_active)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (sales_email, region) DO UPDATE SET
         sales_name = EXCLUDED.sales_name,
         region_code = COALESCE(EXCLUDED.region_code, sales_regions.region_code),
         note = EXCLUDED.note,
         is_active = EXCLUDED.is_active`,
      [r.sales_name, r.sales_email, region, code, r.note, r.is_active]
    );
    n += 1;
  }
  return n;
}

export async function loadActiveSales(client = getPool()) {
  const res = await client.query(
    `SELECT sales_name, sales_email, region, is_active FROM sales_regions WHERE is_active = TRUE`
  );
  return res.rows;
}

export async function loadAnnouncementsForDay(date, client = getPool()) {
  const res = await client.query(
    `SELECT a.id, a.article_id, a.type, a.type_detail, a.title, a.purchaser,
            a.district_name, a.project_code, a.bid_open_time, a.budget_amount,
            a.award_amount, a.supplier, a.tags, a.publish_time,
            COALESCE(
              (SELECT json_agg(json_build_object(
                 'item_name', i.item_name,
                 'budget_amount', i.budget_amount,
                 'expect_month', i.expect_month
               ) ORDER BY i.seq_no NULLS LAST, i.id)
               FROM intention_items i WHERE i.announcement_id = a.id),
              '[]'::json
            ) AS items
     FROM announcements a
     WHERE (a.publish_time AT TIME ZONE 'Asia/Shanghai')::date = $1::date
     ORDER BY a.type, a.publish_time`,
    [date]
  );
  return res.rows.map((r) => ({
    ...r,
    items: Array.isArray(r.items) ? r.items : [],
  }));
}

export async function claimDigest(row, client = getPool()) {
  const res = await client.query(
    `INSERT INTO daily_digests (
       report_date, sales_email, region, intention_cnt, bidding_cnt, award_cnt, status
     ) VALUES ($1,$2,$3,$4,$5,$6,'pending')
     ON CONFLICT (report_date, sales_email, region) DO UPDATE SET
       intention_cnt = EXCLUDED.intention_cnt,
       bidding_cnt = EXCLUDED.bidding_cnt,
       award_cnt = EXCLUDED.award_cnt
     WHERE daily_digests.status IS DISTINCT FROM 'sent'
     RETURNING id, status`,
    [
      row.report_date,
      row.sales_email,
      row.region,
      row.intention_cnt,
      row.bidding_cnt,
      row.award_cnt,
    ]
  );
  return res.rows[0] || null;
}

export async function markDigest(id, { status, error }, client = getPool()) {
  await client.query(
    `UPDATE daily_digests SET status = $2, error = $3,
            sent_at = CASE WHEN $2 = 'sent' THEN now() ELSE sent_at END
     WHERE id = $1`,
    [id, status, error || null]
  );
}

export { UNASSIGNED_REGION };
