/**
 * 标签查询 SQL 组装。纯函数，单测不连库。
 * 自动标签用 JSONB @> 包含查询（见数据库设计说明书 §4.3）。
 */

export function tagContains(filters = {}) {
  const tags = {};
  if (filters.district) tags.district = filters.district;
  if (filters.type) tags.type = filters.type;
  if (filters.typeDetail) tags.type_detail = filters.typeDetail;
  if (filters.amountBand) tags.amount_band = filters.amountBand;
  if (filters.yearMonth) tags.year_month = filters.yearMonth;
  return tags;
}

export function buildSearchQuery(filters = {}) {
  const params = [];
  const where = [];
  const tags = tagContains(filters);
  if (Object.keys(tags).length) {
    params.push(JSON.stringify(tags));
    where.push(`tags @> $${params.length}::jsonb`);
  }
  if (filters.from) {
    params.push(filters.from);
    where.push(`(publish_time AT TIME ZONE 'Asia/Shanghai')::date >= $${params.length}::date`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`(publish_time AT TIME ZONE 'Asia/Shanghai')::date <= $${params.length}::date`);
  }
  const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 50;
  params.push(limit);
  const sql = `
SELECT id, article_id, type, type_detail, title, district_name, purchaser,
       budget_amount, award_amount, tags, publish_time
FROM announcements
${where.length ? `WHERE ${where.join(' AND ')}` : ''}
ORDER BY publish_time DESC
LIMIT $${params.length}
`.trim();
  return { sql, params };
}

export function buildSummaryQuery(filters = {}) {
  const params = [];
  const where = [];
  if (filters.from) {
    params.push(filters.from);
    where.push(`day >= $${params.length}::date`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`day <= $${params.length}::date`);
  }
  const sql = `
SELECT day, district_name, type, type_detail, amount_band, cnt
FROM v_daily_summary
${where.length ? `WHERE ${where.join(' AND ')}` : ''}
ORDER BY day, district_name, type
`.trim();
  return { sql, params };
}

export function buildUnassignedQuery(filters = {}) {
  const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 50;
  return {
    sql: `
SELECT id, article_id, type, title, district_name, tags, publish_time
FROM announcements
WHERE district_name IS NULL
ORDER BY publish_time DESC
LIMIT $1
`.trim(),
    params: [limit],
  };
}

export function buildDistrictTypeQuery() {
  return {
    sql: `SELECT district, type, amount_band, cnt FROM v_by_district_type ORDER BY cnt DESC, district`,
    params: [],
  };
}
