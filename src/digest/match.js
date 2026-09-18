/**
 * 区域-销售匹配。纯函数。
 * 公告 district_name 与清单 region 都先 normalizeDistrict。
 */
import { normalizeDistrict } from '../normalize/district.js';

export function standardRegion(raw) {
  return normalizeDistrict(raw) || (raw ? String(raw).trim() : null);
}

/**
 * @param {Array<{district_name?: string, type?: string}>} announcements
 * @param {Array<{sales_name: string, sales_email: string, region: string, is_active?: boolean}>} salesRows
 * @returns {{ bundles: Array, unassigned: Array }}
 */
export function assignAnnouncements(announcements, salesRows) {
  const active = (salesRows || []).filter((s) => s.is_active !== false);
  const bundles = new Map();

  function bundleOf(email, name) {
    if (!bundles.has(email)) {
      bundles.set(email, { sales_email: email, sales_name: name, regions: new Set(), items: [] });
    }
    const b = bundles.get(email);
    if (name && !b.sales_name) b.sales_name = name;
    return b;
  }

  for (const s of active) {
    const region = standardRegion(s.region);
    if (!region || !s.sales_email) continue;
    bundleOf(s.sales_email, s.sales_name).regions.add(region);
  }

  const regionOwners = new Map();
  for (const s of active) {
    const region = standardRegion(s.region);
    if (!region || !s.sales_email) continue;
    if (!regionOwners.has(region)) regionOwners.set(region, []);
    regionOwners.get(region).push(s);
  }

  const unassigned = [];
  for (const a of announcements || []) {
    const district = standardRegion(a.district_name);
    const owners = district ? regionOwners.get(district) : null;
    if (!owners || owners.length === 0) {
      unassigned.push(a);
      continue;
    }
    const seen = new Set();
    for (const s of owners) {
      if (seen.has(s.sales_email)) continue;
      seen.add(s.sales_email);
      bundleOf(s.sales_email, s.sales_name).items.push(a);
    }
  }

  return {
    bundles: [...bundles.values()].map((b) => ({
      ...b,
      regions: [...b.regions].sort(),
    })),
    unassigned,
  };
}

export function countByType(items) {
  const c = { intention: 0, bidding: 0, award: 0 };
  for (const it of items || []) {
    if (c[it.type] !== undefined) c[it.type] += 1;
  }
  return c;
}

export const UNASSIGNED_REGION = '待分配';
export const CITYWIDE_REGION = '全市';
