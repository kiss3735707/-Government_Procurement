/**
 * 采集主流程：列表（客户端按 publishDate 过滤）→ 幂等入库 → 详情状态机 → 可选 JSON 落盘。
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
import { shanghaiDayBounds, todayShanghai } from './window.js';
import { mapDetailPatch, mapListRow } from './db/map.js';
import { nextDetailStatus, shouldFetchDetail } from './db/status.js';
import {
  finishCollectRun,
  insertAnnouncementList,
  listRetryQueue,
  markDetailFailed,
  replaceIntentionItems,
  startCollectRun,
  updateAnnouncementDetail,
  upsertProject,
} from './db/store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'out');

function parseTypeDetail(item) {
  return item.pathName || null;
}

export function parseByType(type, detail) {
  switch (type) {
    case 'intention': {
      const items = detail ? parseIntentionItems(detail) : [];
      return { items, itemsCount: items.length };
    }
    case 'bidding':
      return detail ? parseBidding(detail) : {};
    case 'award':
      return detail ? parseAward(detail) : {};
    default:
      return {};
  }
}

function toOutputItem(it, cat, parsed, tags) {
  return {
    siteCode: 'sh-zfcg',
    articleId: it.articleId,
    categoryCode: cat.code,
    type: cat.type,
    typeDetail: parseTypeDetail(it),
    title: it.title,
    purchaser: it.purchaseName || it.author,
    purchaserSource: it.purchaseName ? 'purchaseName' : 'author',
    publisher: it.author,
    districtNameRaw: it.districtName,
    districtName: normalizeDistrict(it.districtName),
    publishTime: it.publishDate,
    parsed,
    tags,
  };
}

function listItemFromRow(row) {
  const fromRaw = row.raw_json?.list;
  if (fromRaw) return fromRaw;
  return {
    articleId: row.article_id,
    title: row.title,
    purchaseName: row.purchaser,
    author: row.publisher,
    districtName: row.district_name,
    publishDate: row.publish_time ? new Date(row.publish_time).getTime() : null,
    pathName: null,
  };
}

async function collectCategory(cat, { date, limit, db }) {
  const stats = {
    category: cat.code,
    type: cat.type,
    total: 0,
    fetched: 0,
    details: 0,
    inserted: 0,
    pageCount: 0,
    detailOk: 0,
    items: [],
  };
  const { dayStart, dayEnd } = shanghaiDayBounds(date);
  // 接口首页是最新数据；limit 只限制命中条数，不能少翻页（否则历史日会被跳过）
  const maxPages = 100;
  const batch = [];

  for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
    const { total, items } = await fetchCategoryPage(cat.code, {
      pageNo,
      pageSize: 50,
      beginDate: date,
      endDate: date,
    });
    stats.total = total;
    stats.pageCount = pageNo;
    if (items.length === 0) break;
    stats.fetched += items.length;

    let stopEarly = false;
    for (const it of items) {
      const t = it.publishDate;
      if (t < dayStart) {
        stopEarly = true;
        break;
      }
      if (t >= dayEnd) continue;
      if (limit && batch.length >= limit) {
        stopEarly = true;
        break;
      }

      const row = mapListRow(it, cat);
      let dbRow = null;
      if (db) {
        dbRow = await insertAnnouncementList(row);
        if (dbRow.inserted) stats.inserted += 1;
      }
      batch.push({ item: it, dbRow });
    }
    if (stopEarly) break;
  }

  const seen = new Set(batch.map((b) => String(b.item.articleId)));
  const targets = batch.filter((b) => !b.dbRow || shouldFetchDetail(b.dbRow.detail_status));

  if (db && !limit) {
    const extra = await listRetryQueue(cat.code);
    for (const row of extra) {
      if (seen.has(String(row.article_id))) continue;
      targets.push({ item: listItemFromRow(row), dbRow: { id: row.id, inserted: false, detail_status: row.detail_status } });
    }
  }

  for (const t of targets) {
    const it = t.item;
    let fetchError = null;
    const detail = await fetchDetail(it.articleId).catch((e) => {
      fetchError = e;
      console.warn(`[detail] failed ${it.articleId}: ${e.message}`);
      return null;
    });
    stats.details += detail ? 1 : 0;

    const parsed = parseByType(cat.type, detail);
    const tags = buildTags({
      type: cat.type,
      typeDetail: parseTypeDetail(it),
      districtName: it.districtName,
      purchaser: it.purchaseName || it.author,
      publishTime: it.publishDate,
      parsed,
      detail,
    });
    stats.items.push(toOutputItem(it, cat, parsed, tags));

    if (!db || !t.dbRow) continue;

    const status = nextDetailStatus({ detail, fetchError });
    if (status === 'done') {
      const patch = mapDetailPatch({
        type: cat.type,
        item: it,
        detail,
        parsed,
        tags,
        rawList: it,
      });
      await updateAnnouncementDetail(t.dbRow.id, patch, status);
      if (cat.type === 'intention') {
        await replaceIntentionItems(t.dbRow.id, parsed.items ?? []);
      }
      await upsertProject(
        {
          project_code: patch.project_code,
          project_name: patch.project_name,
          purchaser: it.purchaseName || it.author || null,
          budget_amount: patch.budget_amount,
          award_amount: patch.award_amount,
          supplier: patch.supplier,
        },
        cat.type
      );
      stats.detailOk += 1;
    } else {
      await markDetailFailed(t.dbRow.id, { list: it, error: fetchError?.message ?? 'empty detail' });
    }
  }

  const unknownDistricts = new Set(
    stats.items.map((i) => i.districtNameRaw).filter((d) => d && !normalizeDistrict(d))
  );
  if (unknownDistricts.size) console.warn('  未识别区划:', [...unknownDistricts]);

  return stats;
}

/**
 * @param {object} opts { date, limit, db }
 */
export async function runCollect(opts = {}) {
  const date = opts.date ?? todayShanghai();
  const db = Boolean(opts.db);
  const results = [];
  for (const cat of CATEGORIES) {
    console.log(`\n=== ${cat.name} (${cat.code}) @ ${date} ===`);
    let runId = null;
    if (db) runId = await startCollectRun({ runDate: date, category: cat.code });
    try {
      const stats = await collectCategory(cat, { date, limit: opts.limit, db });
      results.push(stats);
      console.log(
        `total=${stats.total} fetched=${stats.fetched} inserted=${stats.inserted} details=${stats.details} output=${stats.items.length}`
      );
      if (db && runId) {
        await finishCollectRun(runId, {
          page_count: stats.pageCount,
          fetched_cnt: stats.fetched,
          inserted_cnt: stats.inserted,
          detail_ok_cnt: stats.detailOk,
          status: 'success',
        });
      }
    } catch (err) {
      if (db && runId) {
        await finishCollectRun(runId, { status: 'failed', error: err.message });
      }
      console.error(`[collect] ${cat.code} failed: ${err.message}`);
      results.push({ category: cat.code, type: cat.type, error: err.message });
    }
  }
  return { date, results };
}

export async function saveResults(result) {
  await mkdir(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, `collect-${result.date}.json`);
  await writeFile(path, JSON.stringify(result, null, 2), 'utf8');
  return path;
}
