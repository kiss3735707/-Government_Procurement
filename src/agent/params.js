/**
 * 智能体查询参数。不连库。
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = new Set(['intention', 'bidding', 'award']);
const GROUPS = new Set(['supplier', 'industry', 'district', 'purchaser', 'month']);
const AWARD_ONLY = ['industry', 'supplier', 'contentTag'];

function readDates(sp) {
  const date = empty(sp.get('date'));
  const from = empty(sp.get('from'));
  const to = empty(sp.get('to'));
  if (date && (from || to)) throw new Error('date 不能和 from、to 一起用');
  if ((from && !to) || (!from && to)) throw new Error('from 和 to 需要成对出现');
  for (const value of [date, from, to]) {
    if (value && !DATE_RE.test(value)) throw new Error('日期格式须为 YYYY-MM-DD');
  }
  if (from && to && from > to) throw new Error('from 不能晚于 to');
  if (date) return { from: date, to: date };
  return { from, to };
}

function empty(value) {
  const text = String(value || '').trim();
  return text || null;
}

function readDistrict(sp) {
  const district = empty(sp.get('district'));
  if (district === '全市') throw new Error('全市不是区划');
  return district;
}

function readLimit(sp, { fallback, max }) {
  const raw = sp.get('limit');
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new Error('limit 必须是正整数');
  return Math.min(n, max);
}

function readOffset(sp) {
  const raw = sp.get('offset');
  if (raw == null || raw === '') return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error('offset 必须是非负整数');
  return n;
}

function awardFilters(sp, type) {
  const industry = empty(sp.get('industry'));
  const supplier = empty(sp.get('supplier'));
  const contentTag = empty(sp.get('content_tag'));
  if (type !== 'award' && (industry || supplier || contentTag)) {
    throw new Error('行业、供应商、内容标签只适用于中标');
  }
  return { industry, supplier, contentTag };
}

export function parseStatsQuery(searchParams) {
  const group = empty(searchParams.get('group'));
  if (!GROUPS.has(group)) throw new Error('group 必须是 supplier、industry、district、purchaser、month');
  const type = empty(searchParams.get('type')) || 'award';
  if (!TYPES.has(type)) throw new Error('type 必须是 intention、bidding、award');
  if (type !== 'award' && (group === 'supplier' || group === 'industry')) {
    throw new Error('按供应商或行业汇总只适用于中标');
  }
  const dates = readDates(searchParams);
  return {
    group,
    type,
    ...dates,
    district: readDistrict(searchParams),
    ...awardFilters(searchParams, type),
    limit: readLimit(searchParams, { fallback: 20, max: 100 }),
  };
}

export function parseListQuery(searchParams) {
  const type = empty(searchParams.get('type'));
  if (type && !TYPES.has(type)) throw new Error('type 必须是 intention、bidding、award');
  const award = awardFilters(searchParams, type || 'award');
  const forcedAward = Boolean(award.industry || award.supplier || award.contentTag);
  return {
    type: forcedAward ? 'award' : type,
    ...readDates(searchParams),
    district: readDistrict(searchParams),
    ...award,
    limit: readLimit(searchParams, { fallback: 20, max: 50 }),
    offset: readOffset(searchParams),
  };
}

export function parseDetailId(pathname) {
  const match = /^\/api\/agent\/announcements\/(\d+)$/.exec(pathname);
  if (!match) return null;
  return Number(match[1]);
}
