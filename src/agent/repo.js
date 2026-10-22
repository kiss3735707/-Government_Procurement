import { timingSafeEqual } from 'node:crypto';
import {
  buildAwardPackageCountQuery,
  buildAwardStatsQuery,
  buildDetailQuery,
  buildListCountQuery,
  buildListQuery,
  buildNoticeStatsQuery,
  buildUntaggedCountQuery,
} from './sql.js';

function num(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function packagesOf(value) {
  const rows = Array.isArray(value) ? value : [];
  return rows.map((row) => ({
    item_index: row.item_index,
    item_name: row.item_name,
    supplier_name: row.supplier_name,
    deal_amount: num(row.deal_amount),
    industry: row.industry,
    content_tags: Array.isArray(row.content_tags) ? row.content_tags : [],
  }));
}

function listItem(row) {
  return {
    id: Number(row.id),
    type: row.type,
    title: row.title,
    purchaser: row.purchaser,
    district_name: row.district_name,
    publish_time: row.publish_time,
    project_code: row.project_code,
    award_amount: num(row.award_amount),
    budget_amount: num(row.budget_amount),
    packages: packagesOf(row.packages),
  };
}

export async function agentStats(pool, filters) {
  if (filters.type !== 'award') {
    const q = buildNoticeStatsQuery(filters);
    const res = await pool.query(q.sql, q.params);
    return {
      group: filters.group,
      type: filters.type,
      from: filters.from,
      to: filters.to,
      amount_basis: 'budget',
      tagged_package_count: 0,
      untagged_notice_count: 0,
      rows: res.rows.map((row) => ({
        key: row.key,
        package_count: row.package_count,
        notice_count: row.notice_count,
        amount_sum: num(row.amount_sum) || 0,
      })),
    };
  }
  const rowsQ = buildAwardStatsQuery(filters);
  const countQ = buildAwardPackageCountQuery(filters);
  const untaggedQ = buildUntaggedCountQuery(filters);
  const [rows, count, untagged] = await Promise.all([
    pool.query(rowsQ.sql, rowsQ.params),
    pool.query(countQ.sql, countQ.params),
    pool.query(untaggedQ.sql, untaggedQ.params),
  ]);
  return {
    group: filters.group,
    type: 'award',
    from: filters.from,
    to: filters.to,
    amount_basis: 'package',
    tagged_package_count: count.rows[0].n,
    untagged_notice_count: untagged.rows[0].n,
    rows: rows.rows.map((row) => ({
      key: row.key,
      package_count: row.package_count,
      notice_count: row.notice_count,
      amount_sum: num(row.amount_sum) || 0,
    })),
  };
}

export async function agentList(pool, filters) {
  const listQ = buildListQuery(filters);
  const countQ = buildListCountQuery(filters);
  const [list, count] = await Promise.all([
    pool.query(listQ.sql, listQ.params),
    pool.query(countQ.sql, countQ.params),
  ]);
  return {
    total: count.rows[0].n,
    limit: filters.limit,
    offset: filters.offset,
    items: list.rows.map(listItem),
  };
}

export async function agentDetail(pool, id) {
  const q = buildDetailQuery(id);
  const res = await pool.query(q.sql, q.params);
  const row = res.rows[0];
  if (!row) return null;
  const ai = row.ai_payload
    ? {
        status: 'done',
        model: row.ai_model,
        tagged_at: row.ai_tagged_at,
        payload: row.ai_payload,
        packages: packagesOf(row.packages),
      }
    : null;
  return {
    ...listItem(row),
    type_detail: row.type_detail,
    project_name: row.project_name,
    bid_open_time: row.bid_open_time,
    supplier: row.supplier,
    detail_status: row.detail_status,
    content_text: row.content_text,
    tags: row.tags || {},
    intention_items: Array.isArray(row.intention_items) ? row.intention_items : [],
    ai,
  };
}

export function tokenMatches(presented, expected) {
  const a = Buffer.from(String(presented || ''));
  const b = Buffer.from(String(expected || ''));
  if (!b.length || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
