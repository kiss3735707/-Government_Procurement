/**
 * 自动标签生成：公告入库即打标签，支撑后续多维度统计。
 * 标签维度见《数据库设计说明书》§4。
 */
import { normalizeDistrict } from './normalize/district.js';

/** 金额区间划分（可调） */
export function amountBand(amount) {
  if (amount === null || amount === undefined) return null;
  if (amount < 500000) return '<50万';
  if (amount < 2000000) return '50-200万';
  if (amount < 10000000) return '200-1000万';
  return '>1000万';
}

/**
 * 生成公告的自动标签。
 * @param {object} ctx { type, typeDetail, districtName, purchaser, publishTime, parsed, detail }
 */
export function buildTags(ctx) {
  const { type, typeDetail, districtName, purchaser, publishTime, parsed, detail } = ctx;
  const tags = {
    type,
    year_month: monthOf(publishTime),
  };
  if (typeDetail) tags.type_detail = typeDetail;

  const std = normalizeDistrict(districtName);
  if (std) tags.district = std;

  if (purchaser) tags.purchaser = purchaser;

  const track = detail?.announcementLinkDtoList;
  if (Array.isArray(track) && track.length) {
    tags.project_track = track.filter((t) => t.isExist).map((t) => t.typeName).join('→');
  }

  if (type === 'intention') {
    const months = [...new Set((parsed.items ?? []).map((i) => i.expect_month).filter(Boolean))];
    if (months.length) tags.intent_month = months.join(',');
    const band = [...new Set((parsed.items ?? []).map((i) => amountBand(i.budget_amount)).filter(Boolean))];
    if (band.length) tags.amount_band = band.join(',');
  } else if (type === 'bidding') {
    if (parsed.budgetAmount) tags.amount_band = amountBand(parsed.budgetAmount);
    if (parsed.fundSource) tags.fund_source = parsed.fundSource;
  } else if (type === 'award') {
    if (parsed.awardAmount) tags.amount_band = amountBand(parsed.awardAmount);
    if (parsed.suppliers?.length) tags.supplier = parsed.suppliers.join(',');
  }

  return tags;
}

function monthOf(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
