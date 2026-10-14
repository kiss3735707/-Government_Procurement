/**
 * 历史中标补采：只采中标栏目，不跑每日重试队列，失败状态不写 failed。
 */
import { fetchCategoryPage, fetchDetail } from '../adapter/shanghai.js';
import { buildTags } from '../tags.js';
import { normalizeDistrict } from '../normalize/district.js';
import { mapDetailPatch, mapListRow } from '../db/map.js';
import { shouldFetchBackfillDetail } from '../db/status.js';
import { closePool } from '../db/pool.js';
import {
  finishCollectRun,
  insertAnnouncementList,
  markDetailFailed,
  startCollectRun,
  updateAnnouncementDetail,
  upsertProject,
} from '../db/store.js';
import { parseByType } from '../run.js';
import {
  AWARD_CATEGORY,
  backfillFailureStatus,
  backfillListStatus,
  collectBackfillList,
  eachDateInclusive,
  msUntilBackfillResume,
} from './plan.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function persistDay(cat, items, db) {
  const stats = { inserted: 0, details: 0, detailOk: 0, failed: 0 };
  if (!db) return stats;

  for (const it of items) {
    const row = mapListRow(it, cat);
    row.detail_status = backfillListStatus();
    const dbRow = await insertAnnouncementList(row);
    if (dbRow.inserted) stats.inserted += 1;
    if (!shouldFetchBackfillDetail(dbRow.detail_status)) continue;

    let fetchError = null;
    const detail = await fetchDetail(it.articleId).catch((e) => {
      fetchError = e;
      console.warn(`[backfill detail] failed ${it.articleId}: ${e.message}`);
      return null;
    });
    stats.details += detail ? 1 : 0;
    const parsed = parseByType(cat.type, detail);
    const tags = buildTags({
      type: cat.type,
      typeDetail: it.pathName || null,
      districtName: it.districtName,
      purchaser: it.purchaseName || it.author,
      publishTime: it.publishDate,
      parsed,
      detail,
    });
    if (detail && !fetchError) {
      const patch = mapDetailPatch({
        type: cat.type,
        item: it,
        detail,
        parsed,
        tags,
        rawList: it,
      });
      await updateAnnouncementDetail(dbRow.id, patch, 'done');
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
      await markDetailFailed(
        dbRow.id,
        { list: it, error: fetchError?.message ?? 'empty detail' },
        undefined,
        backfillFailureStatus()
      );
      stats.failed += 1;
    }
  }
  return stats;
}

export async function runAwardBackfill({ from, to, limit = 0, db = false }) {
  const cat = AWARD_CATEGORY;
  const dates = eachDateInclusive(from, to);
  const results = [];
  for (const date of dates) {
    const wait = msUntilBackfillResume(new Date());
    if (wait > 0) {
      console.log(`暂停补采至 19:00，避开 17:00 采集和 18:00 日报（约 ${Math.ceil(wait / 60000)} 分钟）`);
      if (db) await closePool();
      await sleep(wait);
    }
    console.log(`\n=== 补采中标 ${date} ===`);
    let runId = null;
    if (db) runId = await startCollectRun({ runDate: date, category: cat.code });
    try {
      const list = await collectBackfillList(date, {
        limit,
        fetchPage: (opts) => fetchCategoryPage(cat.code, opts),
      });
      const unknown = new Set(
        list.items.map((it) => it.districtName).filter((d) => d && !normalizeDistrict(d))
      );
      if (unknown.size) console.warn('  未识别区划:', [...unknown]);
      const saved = await persistDay(cat, list.items, db);
      const row = {
        date,
        total: list.total,
        pages: list.pages,
        matched: list.items.length,
        ...saved,
      };
      results.push(row);
      console.log(
        `total=${row.total} matched=${row.matched} inserted=${row.inserted} detailOk=${row.detailOk} failed=${row.failed}`
      );
      if (db && runId) {
        await finishCollectRun(runId, {
          page_count: list.pages,
          fetched_cnt: list.items.length,
          inserted_cnt: saved.inserted,
          detail_ok_cnt: saved.detailOk,
          status: 'success',
        });
      }
    } catch (err) {
      if (db && runId) {
        await finishCollectRun(runId, { status: 'failed', error: err.message });
      }
      console.error(`[backfill] ${date} failed: ${err.message}`);
      results.push({ date, error: err.message });
      if (err.code === 'UNFILTERED') throw err;
    }
  }
  return { from, to, results };
}
