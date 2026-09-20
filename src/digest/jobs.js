/**
 * 组装一日日报：匹配 → 渲染。不发信、不写库。
 */
import { assignAnnouncements, citywideRecipients, CITYWIDE_REGION, countByType, UNASSIGNED_REGION } from './match.js';
import { renderDigest } from './render.js';

function citywideJob({ date, to, name, announcements }) {
  const counts = countByType(announcements);
  return {
    kind: 'citywide',
    report_date: date,
    to,
    sales_name: name,
    region: CITYWIDE_REGION,
    regions: [CITYWIDE_REGION],
    items: announcements,
    ...counts,
    skipEmpty: false,
    mail: renderDigest({
      date,
      name,
      regions: [CITYWIDE_REGION],
      items: announcements,
      citywide: true,
    }),
  };
}

export function buildDigestJobs({ date, announcements, salesRows, adminEmail }) {
  const { bundles } = assignAnnouncements(announcements, salesRows);
  const recipients = citywideRecipients(salesRows);
  const citywideSet = new Set(recipients.map((r) => r.sales_email.trim().toLowerCase()));
  const admin = (adminEmail || '').trim();
  const adminKey = admin.toLowerCase();
  const useFallbackAdmin = recipients.length === 0 && Boolean(admin);
  const jobs = [];

  for (const b of bundles) {
    const key = b.sales_email.trim().toLowerCase();
    if (citywideSet.has(key)) continue;
    if (useFallbackAdmin && key === adminKey) continue;
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

  if (!(announcements || []).length) return jobs;

  if (recipients.length) {
    for (const r of recipients) {
      jobs.push(citywideJob({ date, to: r.sales_email, name: r.sales_name, announcements }));
    }
  } else if (useFallbackAdmin) {
    jobs.push(citywideJob({ date, to: admin, name: '管理员', announcements }));
  }
  return jobs;
}
