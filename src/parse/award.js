/**
 * 中标（成交）结果公告正文解析。
 * 实测正文含：成交总合同数、成交总合同金额（元）等；
 * 供应商明细部分在正文表格、部分在附件 PDF（PDF 解析为二期）。
 */
import { loadContent, parseTable } from './html.js';
import { parseMoney } from './intention.js';

/**
 * 解析中标结果详情。
 * @returns {{
 *   projectCode, projectName, awardAmount, contractCount,
 *   suppliers: string[], text
 * }}
 */
export function parseAward(detail) {
  const html = detail?.content ?? '';
  const $ = loadContent(html);
  const text = $('body').text() ?? '';
  const norm = text.replace(/\s+/g, ' ');

  let awardAmount = null;
  // 兼容全角/半角括号：成交总合同金额（元）/ 成交总合同金额(元)
  const am = norm.match(/成交总合同金额\s*[(（]?\s*元\s*[)）]?\s*[:：]\s*([\d,]+(?:\.\d+)?)/);
  if (am) awardAmount = parseMoney(am[1]);

  let contractCount = null;
  const cm = norm.match(/成交总合同数\s*[:：]\s*(\d+)/);
  if (cm) contractCount = Number(cm[1]);

  // 供应商：从表格里找"供应商"列。政采云表格通常无 <thead>，首行即表头。
  const { headers, rows } = parseTable($);
  let tableHeaders = headers;
  let tableRows = rows;
  if (tableHeaders.length === 0 && tableRows.length > 0) {
    tableHeaders = tableRows[0];
    tableRows = tableRows.slice(1);
  }
  const suppliers = [];
  let supIdx = -1;
  for (let i = 0; i < tableHeaders.length; i++) {
    if (tableHeaders[i].includes('供应商')) { supIdx = i; break; }
  }
  if (supIdx >= 0) {
    for (const row of tableRows) {
      const name = row[supIdx]?.trim();
      if (name && name !== '中标供应商名称' && !suppliers.includes(name)) suppliers.push(name);
    }
  }

  // 供应商侧成交金额：表头含"成交金额/成交（成交金额）"的列（多行时取首行）
  let supplierAmount = null;
  let amtIdx = -1;
  for (let i = 0; i < tableHeaders.length; i++) {
    if (tableHeaders[i].includes('成交金额') || tableHeaders[i].includes('中标（成交')) {
      amtIdx = i; break;
    }
  }
  if (amtIdx >= 0 && tableRows.length) {
    supplierAmount = parseMoney(tableRows[0][amtIdx]);
  }

  return {
    projectCode: detail?.projectCode ?? null,
    projectName: detail?.projectName ?? null,
    // 统一语义：awardAmount = 本公告的中标（成交）金额。
    // 优先明细式表格金额（supplierAmount），缺省时用正文"成交总合同金额"汇总。
    awardAmount: supplierAmount ?? awardAmount,
    awardAmountSource: supplierAmount !== null ? 'table' : awardAmount !== null ? 'summary' : null,
    contractCount,
    suppliers,
    supplierAmount,
    text,
  };
}
