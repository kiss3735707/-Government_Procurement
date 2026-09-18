/**
 * 采购意向公开正文解析。
 * 正文表格列（实测）：序号 | 采购项目名称 | 采购需求概况 | 预算金额（元）| 预计采购时间（填写到月）| 备注
 * 一份意向公告 = N 条采购项目明细。
 */
import { loadContent, parseTable } from './html.js';

const KNOWN_COLUMNS = [
  '序号', '采购项目名称', '项目名称', '采购需求概况', '需求概况',
  '预算金额', '预算金额（元）', '预计采购时间', '预计采购时间（填写到月）',
  '备注',
];

function findCol(headers, candidates) {
  for (const c of candidates) {
    const idx = headers.findIndex((h) => h.includes(c));
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * 解析意向公开详情，返回明细数组。
 * @param {object} detail 详情接口返回
 * @returns {Array<{seq_no,item_name,item_summary,budget_amount,expect_month,remark}>}
 */
export function parseIntentionItems(detail) {
  const html = detail?.content ?? '';
  const $ = loadContent(html);
  const { headers, rows } = parseTable($);

  // 政采云意向表格：多数无 thead，第一行即表头
  let tableHeaders = headers;
  let tableRows = rows;
  if (tableHeaders.length === 0 && tableRows.length > 0) {
    tableHeaders = tableRows[0];
    tableRows = tableRows.slice(1);
  }

  const idxName = findCol(tableHeaders, ['采购项目名称', '项目名称']);
  const idxSummary = findCol(tableHeaders, ['采购需求概况', '需求概况']);
  const idxBudget = findCol(tableHeaders, ['预算金额']);
  const idxMonth = findCol(tableHeaders, ['预计采购时间']);
  const idxSeq = findCol(tableHeaders, ['序号']);
  const idxRemark = findCol(tableHeaders, ['备注']);

  // 表头不匹配时，按固定列序兜底（序号|名称|概况|金额|月份|备注）
  const fallback = idxName < 0;

  const items = [];
  for (const row of tableRows) {
    if (row.length === 0) continue;
    if (fallback) {
      // 固定列序兜底
      const [seq, name, summary, budget, month, remark] = row;
      if (!name && !budget) continue;
      items.push({
        seq_no: seq ? Number(seq) : null,
        item_name: (name ?? '').trim(),
        item_summary: (summary ?? '').trim(),
        budget_amount: parseMoney(budget),
        expect_month: normalizeMonth(month),
        remark: (remark ?? '').trim() || null,
      });
    } else {
      const name = row[idxName]?.trim();
      if (!name) continue;
      items.push({
        seq_no: idxSeq >= 0 && row[idxSeq] ? Number(row[idxSeq]) : null,
        item_name: name,
        item_summary: idxSummary >= 0 ? row[idxSummary]?.trim() : null,
        budget_amount: idxBudget >= 0 ? parseMoney(row[idxBudget]) : null,
        expect_month: idxMonth >= 0 ? normalizeMonth(row[idxMonth]) : null,
        remark: idxRemark >= 0 ? row[idxRemark]?.trim() || null : null,
      });
    }
  }
  return items;
}

/** "1,726,000.00" / "1726000.00" / "1726000 元" → 1726000.00；无法解析返回 null */
export function parseMoney(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/[,\s元]/g, '').trim();
  if (!s || !/^\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

/** "2026-09" / "2026年9月" / "2026-09-01" → "2026-09"；无法解析返回 null */
export function normalizeMonth(v) {
  if (!v) return null;
  const m = String(v).match(/(20\d{2})[年.\-/](\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${String(m[2]).padStart(2, '0')}`;
}
