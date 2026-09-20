import { DISTRICT_CODES, normalizeDistrict, STANDARD_NAMES } from '../normalize/district.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TAG_KEYS = ['product_line', 'customer_stage', 'priority', 'custom'];

export function validateSalesRow(input) {
  const sales_name = String(input.sales_name || '').trim();
  const sales_email = String(input.sales_email || '').trim().toLowerCase();
  const region = normalizeDistrict(input.region);
  const note =
    input.note == null || String(input.note).trim() === '' ? null : String(input.note).trim();
  const is_active = !['0', 'false', 'no', 'n', false, 0].includes(
    typeof input.is_active === 'string' ? input.is_active.trim().toLowerCase() : input.is_active
  );
  if (!sales_name) return { error: '姓名必填' };
  if (!EMAIL_RE.test(sales_email)) return { error: '邮箱格式无效' };
  if (!region) return { error: '区域须为标准区名（16区+本级）' };
  return {
    row: {
      sales_name,
      sales_email,
      region,
      region_code: DISTRICT_CODES[region] || null,
      note,
      is_active,
    },
  };
}

export function validateTag(input) {
  const tag_key = String(input.tag_key || '').trim();
  const tag_value = String(input.tag_value || '').trim();
  if (!TAG_KEYS.includes(tag_key)) return { error: `tag_key 须为 ${TAG_KEYS.join('|')}` };
  if (!tag_value) return { error: 'tag_value 必填' };
  if (tag_key === 'priority' && !['高', '中', '低'].includes(tag_value)) {
    return { error: '优先级须为 高/中/低' };
  }
  return { tag: { tag_key, tag_value } };
}

export { STANDARD_NAMES, EMAIL_RE };
