/** CSV：sales_name,sales_email,region,note,is_active */

export function parseSalesCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((h) => h.trim());
  const idx = (name) => header.indexOf(name);
  const iName = idx('sales_name');
  const iEmail = idx('sales_email');
  const iRegion = idx('region');
  const iNote = idx('note');
  const iActive = idx('is_active');
  if (iName < 0 || iEmail < 0 || iRegion < 0) {
    throw new Error('CSV 表头必须含 sales_name,sales_email,region');
  }
  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    const email = (cols[iEmail] || '').trim();
    const region = (cols[iRegion] || '').trim();
    if (!email || !region) continue;
    const activeRaw = iActive >= 0 ? (cols[iActive] || 'true').trim().toLowerCase() : 'true';
    rows.push({
      sales_name: (cols[iName] || '').trim(),
      sales_email: email,
      region,
      note: iNote >= 0 ? (cols[iNote] || '').trim() || null : null,
      is_active: !['0', 'false', 'no', 'n'].includes(activeRaw),
    });
  }
  return rows;
}
