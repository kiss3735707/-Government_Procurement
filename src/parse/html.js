/**
 * HTML 工具：正文清洗、HTML→纯文本。
 */
import * as cheerio from 'cheerio';

/** 去除政采云正文里的 style/script，返回 cheerio 实例 */
export function loadContent(html) {
  const $ = cheerio.load(html || '', {}, true);
  $('style, script').remove();
  return $;
}

/** 解析表格：返回 { headers: string[], rows: string[][] } */
export function parseTable($, tableSelector = 'table') {
  const $table = $(tableSelector).first();
  if ($table.length === 0) return { headers: [], rows: [] };

  const headers = [];
  $table.find('thead th, tr:first-child th').each((_, el) => {
    headers.push($(el).text().trim());
  });
  // 若无 thead，第一行当表头（政采云表格常无 thead）
  const useHeader = headers.length > 0;

  const rows = [];
  $table.find('tr').each((_, tr) => {
    const cells = [];
    $(tr).find('th, td').each((_, td) => cells.push($(td).text().trim()));
    if (cells.length === 0) return;
    if (!useHeader || $(tr).find('th').length === 0) rows.push(cells);
  });
  return { headers: useHeader ? headers : [], rows };
}

/** HTML → 纯文本（保留段落换行） */
export function toText(html) {
  const $ = loadContent(html);
  // 块级元素后换行
  $('p, div, tr, li, br, h1, h2, h3, h4').each((_, el) => {
    $(el).append('\n');
  });
  const text = $.text().replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

/** 提取键值对：形如 "项目编号：xxx" / "预算金额（元）：xxx" */
export function extractKeyValues($, keys) {
  const result = {};
  const bodyText = $('body').text() ?? '';
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = bodyText.match(new RegExp(`${escaped}\\s*[:：]\\s*([^\\n]{0,120})`, 'i'));
    if (m) result[key] = m[1].trim();
  }
  return result;
}
