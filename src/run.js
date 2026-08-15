/**
 * M1 采集主流程：抓列表 → 抓详情 → 解析 → 打标 → 输出结构化结果。
 * 数据库入库属于 M2；本阶段结果落盘为 JSON，供字段校准。
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES } from './config.js';
import { fetchCategoryPage, fetchDetail } from './adapter/shanghai.js';
import { parseIntentionItems } from './parse/intention.js';
import { parseBidding } from './parse/bidding.js';
import { parseAward } from './parse/award.js';
import { buildTags } from './tags.js';
import { normalizeDistrict } from './normalize/district.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'out');

function parseTypeDetail(item) {
  return item.pathName || null;
}

async function collectCategory(cat, { date, limit }) {
  const stats = { category: cat.code, type: cat.type, total: 0, fetched: 0, details: 0, items: [] };
  let pageNo = 1;
  const maxPages = limit ? Math.ceil(limit / 50) : 100;

  // 目标日期范围（客户端强制过滤：实测 beginDate/endDate 语义不可靠，混入相邻日期记录）
  const dayStart = new Date(`${date}T00:00:00+08:00`).getTime();
  const dayEnd = dayStart + 24 * 3600 * 1000;

  for (; pageNo <= maxPages; pageNo++) {
    const { total, items } = await fetchCategoryPage(cat.code, {
      pageNo,
      pageSize: 50,
      beginDate: date,
      endDate: date,
    });
    stats.total = total;
    if (items.length === 0) break;
    stats.fetched += items.length;

    let stopEarly = false;
    for (const it of items) {
      const t = it.publishDate;
      if (t < dayStart) { stopEarly = true; break; }   // 已翻到更早日期，停止
      if (t >= dayEnd) continue;                        // 相邻的次日记录，跳过
      if (limit && stats.items.length >= limit) { stopEarly = true; break; }
      const detail = await fetchDetail(it.articleId).catch((e) => {
        console.warn(`[detail] failed ${it.articleId}: ${e.message}`);
        return null;
      });
      stats.details += detail ? 1 : 0;

      const parsed = parseByType(cat.type, detail, it);
      const tags = buildTags({
        type: cat.type,
        typeDetail: parseTypeDetail(it),
        districtName: it.districtName,
        purchaser: it.purchaseName,
        publishTime: it.publishDate,
        parsed,
        detail,
      });

      stats.items.push({
        siteCode: 'sh-zfcg',
        articleId: it.articleId,
        categoryCode: cat.code,
        type: cat.type,
        typeDetail: parseTypeDetail(it),
        title: it.title,
        // 中标结果里 purchaseName 常为 null，用 author 兜底并标记来源
        purchaser: it.purchaseName || it.author,
        purchaserSource: it.purchaseName ? 'purchaseName' : 'author',
        publisher: it.author,
        districtNameRaw: it.districtName,
        districtName: normalizeDistrict(it.districtName),
        publishTime: it.publishDate,
        parsed,
        tags,
      });
    }
    if (stopEarly) break;
  }
  return stats;
}

function parseByType(type, detail, item) {
  switch (type) {
    case 'intention':
      return { items: detail ? parseIntentionItems(detail) : [], itemsCount: detail ? parseIntentionItems(detail).length : 0 };
    case 'bidding':
      return detail ? parseBidding(detail) : {};
    case 'award':
      return detail ? parseAward(detail) : {};
    default:
      return {};
  }
}

/**
 * 执行一次采集。
 * @param {object} opts { date: 'YYYY-MM-DD', limit: 每类最多条数 }
 */
export async function runCollect(opts = {}) {
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  const results = [];
  for (const cat of CATEGORIES) {
    console.log(`\n=== ${cat.name} (${cat.code}) @ ${date} ===`);
    const stats = await collectCategory(cat, { date, limit: opts.limit });
    results.push(stats);
    console.log(`total=${stats.total} fetched=${stats.fetched} details=${stats.details} output=${stats.items.length}`);
    const unknownDistricts = new Set(
      stats.items.map((i) => i.districtNameRaw).filter((d) => d && !normalizeDistrict(d))
    );
    if (unknownDistricts.size) console.warn('  未识别区划:', [...unknownDistricts]);
  }
  return { date, results };
}

/** 结果落盘 */
export async function saveResults(result) {
  await mkdir(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, `collect-${result.date}.json`);
  await writeFile(path, JSON.stringify(result, null, 2), 'utf8');
  return path;
}
