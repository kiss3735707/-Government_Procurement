/**
 * 采购公告（招标中）正文解析。
 * 实测正文含：项目编号、项目名称、预算编号、预算金额（元）、最高限价（元）、
 * 开标时间、资金性质（国库资金/自筹资金）等。
 */
import { loadContent } from './html.js';
import { parseMoney } from './intention.js';

/**
 * 解析招标公告详情。
 * @returns {{
 *   projectCode, projectName, budgetAmount, maxLimitAmount,
 *   bidOpenTime, fundSource, text
 * }}
 */
export function parseBidding(detail) {
  const html = detail?.content ?? '';
  const $ = loadContent(html);
  const text = $('body').text() ?? '';
  const norm = text.replace(/\s+/g, ' ');

  const grab = (key) => {
    const m = norm.match(new RegExp(`${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:：]\\s*([^\\s]{0,80})`));
    return m ? m[1].trim() : null;
  };

  // 预算金额：可能有"预算金额（元）：2500000元"或"预算金额：250万元"
  let budget = null;
  const bm = norm.match(/预算金额（元）\s*[:：]\s*([\d,]+(?:\.\d+)?)/);
  if (bm) budget = parseMoney(bm[1]);

  let maxLimit = null;
  // 最高限价（元）：包1-2500000.00元 （可多包，取第一个）
  const mm = norm.match(/最高限价（元）\s*[:：]\s*(?:包\d+-)?([\d,]+(?:\.\d+)?)/);
  if (mm) maxLimit = parseMoney(mm[1]);

  let bidOpenTime = null;
  // 开标时间：2026年09月04日 10:00
  const tm = norm.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}:\d{2})/);
  if (tm) {
    const [, y, mo, d, h] = tm;
    bidOpenTime = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${h}:00`;
  }

  const fund = [];
  if (norm.includes('国库资金')) fund.push('国库');
  if (norm.includes('自筹资金')) fund.push('自筹');

  return {
    projectCode: detail?.projectCode ?? grab('项目编号'),
    projectName: detail?.projectName ?? grab('项目名称'),
    budgetAmount: budget ?? detail?.budgetPrice ?? null,
    maxLimitAmount: maxLimit,
    bidOpenTime,
    fundSource: fund.length ? fund.join('+') : null,
    text,
  };
}
