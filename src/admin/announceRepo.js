import { buildSearchQuery } from '../query/sql.js';

export async function searchAnnouncementsAdmin(pool, filters) {
  const { sql, params } = buildSearchQuery(filters);
  const res = await pool.query(sql, params);
  return res.rows;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function getAnnouncement(pool, id) {
  const res = await pool.query(
    `SELECT a.id, a.article_id, a.type, a.type_detail, a.title, a.purchaser, a.publisher,
            a.district_name, a.project_code, a.project_name, a.bid_open_time, a.fund_source,
            a.budget_amount, a.award_amount, a.supplier, a.content_text, a.publish_time,
            COALESCE(
              (SELECT json_agg(json_build_object(
                 'item_name', i.item_name,
                 'budget_amount', i.budget_amount,
                 'expect_month', i.expect_month
               ) ORDER BY i.seq_no NULLS LAST, i.id)
               FROM intention_items i WHERE i.announcement_id = a.id),
              '[]'::json
            ) AS items,
            COALESCE(
              (SELECT json_agg(json_build_object(
                 'id', t.id, 'tag_key', t.tag_key, 'tag_value', t.tag_value, 'operator', t.operator
               ) ORDER BY t.id)
               FROM announcement_tags t WHERE t.announcement_id = a.id),
              '[]'::json
            ) AS manual_tags
     FROM announcements a
     WHERE a.id = $1`,
    [id]
  );
  if (!res.rowCount) return null;
  const row = res.rows[0];
  return {
    ...row,
    items: asArray(row.items),
    manual_tags: asArray(row.manual_tags),
    source_url: `https://www.zfcg.sh.gov.cn/site/detail?articleId=${row.article_id}`,
  };
}
