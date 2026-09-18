/**
 * 列表/详情 → 入库行。纯函数，单测不连库。
 */
import { SITE } from '../config.js';
import { DISTRICT_CODES, normalizeDistrict } from '../normalize/district.js';
import { toText } from '../parse/html.js';
import { DETAIL_PENDING } from './status.js';

/** 变成 Postgres jsonb 可接受的纯 JSON 值（对象/数组/null）。 */
export function asJsonb(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      try {
        return JSON.parse(`[${t}]`);
      } catch {
        return { text: t };
      }
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

export function mapListRow(item, cat) {
  const districtName = normalizeDistrict(item.districtName);
  return {
    site_code: SITE.code,
    article_id: String(item.articleId),
    category_code: cat.code,
    type: cat.type,
    type_detail: item.pathName || null,
    title: item.title,
    purchaser: item.purchaseName || item.author || null,
    publisher: item.author || null,
    district_name: districtName,
    district_code: districtName ? DISTRICT_CODES[districtName] ?? null : null,
    publish_time: new Date(item.publishDate),
    expired_at: item.expiredTime || item.expireTime
      ? new Date(item.expiredTime || item.expireTime)
      : null,
    detail_status: DETAIL_PENDING,
    raw_json: { list: item },
  };
}

export function mapAttachments(detail) {
  const list =
    detail?.attachmentDtoList ||
    detail?.fileList ||
    detail?.attachments ||
    [];
  if (!Array.isArray(list) || list.length === 0) return null;
  const mapped = list
    .map((a) => ({
      name: a.fileName || a.name || a.title || null,
      url: a.fileUrl || a.url || a.path || null,
    }))
    .filter((a) => a.name || a.url);
  return mapped.length ? mapped : null;
}

function asShanghaiTs(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  if (/Z$|[+-]\d{2}:\d{2}$/.test(s)) return new Date(s);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return new Date(`${s}+08:00`);
  return new Date(value);
}

/**
 * 详情成功后的更新字段（不含 id / 列表已有字段）。
 */
export function mapDetailPatch({ type, item, detail, parsed, tags, rawList }) {
  const html = detail?.content ?? null;
  const suppliers = parsed?.suppliers;
  return {
    project_code: parsed?.projectCode ?? detail?.projectCode ?? null,
    project_name: parsed?.projectName ?? detail?.projectName ?? null,
    bid_open_time: asShanghaiTs(parsed?.bidOpenTime),
    fund_source: parsed?.fundSource ?? null,
    budget_amount: parsed?.budgetAmount ?? null,
    award_amount: parsed?.awardAmount ?? null,
    supplier: Array.isArray(suppliers) && suppliers.length ? suppliers.join('、') : null,
    content_html: html,
    content_text: html ? toText(html) : parsed?.text ?? null,
    attachment_info: asJsonb(mapAttachments(detail)),
    track_links: asJsonb(detail?.announcementLinkDtoList ?? null),
    tags: asJsonb(tags ?? {}),
    raw_json: asJsonb({ list: rawList ?? item, detail }),
  };
}

export function mapIntentionItem(row, announcementId) {
  return {
    announcement_id: announcementId,
    seq_no: Number.isFinite(row.seq_no) ? row.seq_no : null,
    item_name: row.item_name,
    item_summary: row.item_summary ?? null,
    budget_amount: row.budget_amount ?? null,
    expect_month: row.expect_month ?? null,
    remark: row.remark ?? null,
  };
}

const STAGE_RANK = { intention: 1, bidding: 2, award: 3, contract: 4 };

export function nextProjectStage(current, incoming) {
  if (!incoming) return current || 'intention';
  if (!current) return incoming;
  return (STAGE_RANK[incoming] ?? 0) >= (STAGE_RANK[current] ?? 0) ? incoming : current;
}
