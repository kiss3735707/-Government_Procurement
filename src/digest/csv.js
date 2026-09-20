/** CSV：sales_name,sales_email,region,note,is_active */

function splitLine(line) {
  return String(line).split(',').map((c) => c.trim());
}

export function parseSalesCsv(text) {
  return parseSalesCsvDetailed(text).rows;
}

export function parseSalesCsvDetailed(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!raw) return { rows: [], errors: [{ line: 1, reason: 'CSV 为空' }] };
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { rows: [], errors: [{ line: 1, reason: '缺少表头或数据行' }] };
  }
  const header = splitLine(lines[0]);
  const idx = (name) => header.indexOf(name);
  const iName = idx('sales_name');
  const iEmail = idx('sales_email');
  const iRegion = idx('region');
  const iNote = idx('note');
  const iActive = idx('is_active');
  if (iName < 0 || iEmail < 0 || iRegion < 0) {
    return { rows: [], errors: [{ line: 1, reason: 'CSV 表头必须含 sales_name,sales_email,region' }] };
  }
  const rows = [];
  const errors = [];
  for (let n = 1; n < lines.length; n += 1) {
    const lineNo = n + 1;
    const cols = splitLine(lines[n]);
    const email = (cols[iEmail] || '').trim();
    const region = (cols[iRegion] || '').trim();
    if (!email && !region && !(cols[iName] || '').trim()) continue;
    if (!email || !region) {
      errors.push({ line: lineNo, reason: '邮箱或区域为空' });
      continue;
    }
    const activeRaw = iActive >= 0 ? (cols[iActive] || 'true').trim().toLowerCase() : 'true';
    rows.push({
      line: lineNo,
      sales_name: (cols[iName] || '').trim(),
      sales_email: email,
      region,
      note: iNote >= 0 ? (cols[iNote] || '').trim() || null : null,
      is_active: !['0', 'false', 'no', 'n'].includes(activeRaw),
    });
  }
  return { rows, errors };
}

function csvCell(value) {
  return String(value ?? '').replace(/,/g, '，').replace(/\r?\n/g, ' ');
}

export function salesToCsv(rows) {
  const header = 'sales_name,sales_email,region,region_code,note,is_active';
  const lines = (rows || []).map((r) =>
    [
      csvCell(r.sales_name),
      csvCell(r.sales_email),
      csvCell(r.region),
      csvCell(r.region_code),
      csvCell(r.note),
      r.is_active === false ? 'false' : 'true',
    ].join(',')
  );
  return [header, ...lines].join('\n') + '\n';
}

export const SALES_CSV_TEMPLATE = `sales_name,sales_email,region,note,is_active
张三,sales@example.com,浦东新区,示例勿用于生产,true
`;
