/**
 * 智能体只读 SQL。金额汇总用包件成交金额，不用公告头金额。
 */

function pushDate(where, params, filters) {
  if (filters.from) {
    params.push(filters.from);
    where.push(`(a.publish_time AT TIME ZONE 'Asia/Shanghai')::date >= $${params.length}::date`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`(a.publish_time AT TIME ZONE 'Asia/Shanghai')::date <= $${params.length}::date`);
  }
}

function pushDistrict(where, params, filters) {
  if (!filters.district) return;
  params.push(filters.district);
  where.push(`a.district_name = $${params.length}`);
}

function pushPackageFilters(where, params, filters, alias = 'p') {
  if (filters.industry) {
    params.push(filters.industry);
    where.push(`${alias}.industry = $${params.length}`);
  }
  if (filters.supplier) {
    params.push(filters.supplier);
    where.push(`${alias}.supplier_name = $${params.length}`);
  }
  if (filters.contentTag) {
    params.push(JSON.stringify([filters.contentTag]));
    where.push(`${alias}.content_tags @> $${params.length}::jsonb`);
  }
}

const GROUP_SQL = {
  supplier: 'p.supplier_name',
  industry: 'p.industry',
  district: 'a.district_name',
  purchaser: 'a.purchaser',
  month: `to_char(a.publish_time AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM')`,
};

export function buildAwardStatsQuery(filters) {
  const params = [];
  const where = [`a.type = 'award'`];
  pushDate(where, params, filters);
  pushDistrict(where, params, filters);
  pushPackageFilters(where, params, filters);
  params.push(filters.limit);
  const key = GROUP_SQL[filters.group];
  const sql = `
    SELECT ${key} AS key,
           count(*)::int AS package_count,
           count(DISTINCT a.id)::int AS notice_count,
           COALESCE(sum(p.deal_amount), 0)::float8 AS amount_sum
    FROM announcements a
    JOIN award_packages p ON p.announcement_id = a.id
    JOIN announcement_ai ai ON ai.announcement_id = a.id AND ai.status = 'done'
    WHERE ${where.join(' AND ')}
    GROUP BY 1
    ORDER BY amount_sum DESC NULLS LAST, package_count DESC, key ASC
    LIMIT $${params.length}`;
  return { sql, params };
}

export function buildAwardPackageCountQuery(filters) {
  const params = [];
  const where = [`a.type = 'award'`];
  pushDate(where, params, filters);
  pushDistrict(where, params, filters);
  pushPackageFilters(where, params, filters);
  const sql = `
    SELECT count(*)::int AS n
    FROM announcements a
    JOIN award_packages p ON p.announcement_id = a.id
    JOIN announcement_ai ai ON ai.announcement_id = a.id AND ai.status = 'done'
    WHERE ${where.join(' AND ')}`;
  return { sql, params };
}

export function buildUntaggedCountQuery(filters) {
  const params = [];
  const where = [`a.type = 'award'`, `ai.id IS NULL`];
  pushDate(where, params, filters);
  pushDistrict(where, params, filters);
  const sql = `
    SELECT count(*)::int AS n
    FROM announcements a
    LEFT JOIN announcement_ai ai ON ai.announcement_id = a.id AND ai.status = 'done'
    WHERE ${where.join(' AND ')}`;
  return { sql, params };
}

export function buildNoticeStatsQuery(filters) {
  const params = [];
  const where = [];
  params.push(filters.type);
  where.push(`a.type = $${params.length}`);
  pushDate(where, params, filters);
  pushDistrict(where, params, filters);
  params.push(filters.limit);
  const key = GROUP_SQL[filters.group];
  const sql = `
    SELECT ${key} AS key,
           count(*)::int AS package_count,
           count(*)::int AS notice_count,
           COALESCE(sum(a.budget_amount), 0)::float8 AS amount_sum
    FROM announcements a
    WHERE ${where.join(' AND ')}
    GROUP BY 1
    ORDER BY amount_sum DESC NULLS LAST, notice_count DESC, key ASC
    LIMIT $${params.length}`;
  return { sql, params };
}

const PACKAGE_JSON = `
  COALESCE((
    SELECT json_agg(json_build_object(
      'item_index', p.item_index,
      'item_name', p.item_name,
      'supplier_name', p.supplier_name,
      'deal_amount', p.deal_amount,
      'industry', p.industry,
      'content_tags', p.content_tags
    ) ORDER BY p.item_index NULLS LAST, p.id)
    FROM award_packages p
    JOIN announcement_ai ai ON ai.announcement_id = a.id AND ai.status = 'done'
    WHERE p.announcement_id = a.id
  ), '[]'::json)`;

function listWhere(filters, params) {
  const where = [];
  if (filters.type) {
    params.push(filters.type);
    where.push(`a.type = $${params.length}`);
  }
  pushDate(where, params, filters);
  pushDistrict(where, params, filters);
  if (filters.industry || filters.supplier || filters.contentTag) {
    const pkg = [];
    pushPackageFilters(pkg, params, filters);
    where.push(`EXISTS (
      SELECT 1 FROM award_packages p
      JOIN announcement_ai ai ON ai.announcement_id = a.id AND ai.status = 'done'
      WHERE p.announcement_id = a.id AND ${pkg.join(' AND ')}
    )`);
  }
  return where.length ? where : ['TRUE'];
}

export function buildListQuery(filters) {
  const params = [];
  const where = listWhere(filters, params);
  params.push(filters.limit, filters.offset);
  const sql = `
    SELECT a.id, a.type, a.title, a.purchaser, a.district_name, a.publish_time,
           a.project_code, a.award_amount, a.budget_amount,
           ${PACKAGE_JSON} AS packages
    FROM announcements a
    WHERE ${where.join(' AND ')}
    ORDER BY a.publish_time DESC, a.id DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}`;
  return { sql, params };
}

export function buildListCountQuery(filters) {
  const params = [];
  const where = listWhere(filters, params);
  const sql = `SELECT count(*)::int AS n FROM announcements a WHERE ${where.join(' AND ')}`;
  return { sql, params };
}

export function buildDetailQuery(id) {
  const sql = `
    SELECT a.id, a.type, a.type_detail, a.title, a.purchaser, a.district_name,
           a.publish_time, a.project_code, a.project_name, a.bid_open_time,
           a.budget_amount, a.award_amount, a.supplier, a.detail_status,
           a.content_text, a.tags,
           COALESCE((
             SELECT json_agg(json_build_object(
               'item_name', i.item_name,
               'budget_amount', i.budget_amount,
               'expect_month', i.expect_month
             ) ORDER BY i.seq_no NULLS LAST, i.id)
             FROM intention_items i WHERE i.announcement_id = a.id
           ), '[]'::json) AS intention_items,
           CASE WHEN ai.status = 'done' THEN ai.payload ELSE NULL END AS ai_payload,
           CASE WHEN ai.status = 'done' THEN ai.model ELSE NULL END AS ai_model,
           CASE WHEN ai.status = 'done' THEN ai.tagged_at ELSE NULL END AS ai_tagged_at,
           ${PACKAGE_JSON} AS packages
    FROM announcements a
    LEFT JOIN announcement_ai ai ON ai.announcement_id = a.id
    WHERE a.id = $1`;
  return { sql, params: [id] };
}
