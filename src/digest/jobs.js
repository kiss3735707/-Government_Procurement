/**
 * 组装一日日报：匹配 → 渲染。不发信、不写库。
 */
import { assignAnnouncements, CITYWIDE_REGION, countByType, UNASSIGNED_REGION } from './match.js';
import { renderDigest } from './render.js';

export function buildDigestJobs({ date, announcements, salesRows, adminEmail }) {
  const { bundles } = assignAnnouncements(announcements, salesRows);
  const jobs = [];
  const admin = (adminEmail || '').trim().toLowerCase();

  for (const b of bundles) {
    if (admin && b.sales_email.trim().toLowerCase() === admin) continue;
    const counts = countByType(b.items);
    jobs.push({
      kind: 'sales',
      report_date: date,
      to: b.sales_email,
      sales_name: b.sales_name,
      region: b.regions.join('、') || UNASSIGNED_REGION,
      regions: b.regions,
      items: b.items,
      ...counts,
      skipEmpty: b.items.length === 0,
      mail: renderDigest({ date, name: b.sales_name, regions: b.regions, items: b.items }),
    });
  }

  if (admin && (announcements || []).length) {
    const counts = countByType(announcements);
    jobs.push({
      kind: 'citywide',
      report_date: date,
      to: adminEmail,
      sales_name: '管理员',
      region: CITYWIDE_REGION,
      regions: [CITYWIDE_REGION],
      items: announcements,
      ...counts,
      skipEmpty: false,
      mail: renderDigest({
        date,
        name: '管理员',
        regions: [CITYWIDE_REGION],
        items: announcements,
        citywide: true,
      }),
    });
  }
  return jobs;
}
