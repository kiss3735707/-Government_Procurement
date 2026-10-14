import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCategoryBody } from '../src/adapter/categoryBody.js';
import { RETRY_STATUSES, shouldFetchDetail } from '../src/db/status.js';
import {
  assertBackfillAllowed,
  awardPublishWindow,
  backfillFailureStatus,
  backfillQuietHoursBlocked,
  collectBackfillList,
  eachDateInclusive,
  listPageIsUnfiltered,
  msUntilBackfillResume,
  takeDayItems,
} from '../src/backfill/plan.js';
import { shanghaiDayBounds } from '../src/window.js';

describe('buildCategoryBody', () => {
  it('daily collect body has no millisecond window', () => {
    const body = buildCategoryBody({
      parentId: '137027',
      categoryCode: 'ZcyAnnouncement4',
      pageNo: 1,
      pageSize: 50,
      beginDate: '2026-09-28',
      endDate: '2026-09-28',
    });
    assert.equal(body.beginDate, '2026-09-28');
    assert.equal(body.publishDateBegin, undefined);
    assert.equal(body.publishDateEnd, undefined);
  });

  it('backfill body sends the millisecond window only', () => {
    const body = buildCategoryBody({
      parentId: '137027',
      categoryCode: 'ZcyAnnouncement4',
      pageNo: 1,
      pageSize: 50,
      publishDateBegin: 1,
      publishDateEnd: 2,
    });
    assert.equal(body.publishDateBegin, 1);
    assert.equal(body.publishDateEnd, 2);
    assert.equal(body.beginDate, undefined);
  });
});

describe('backfill plan', () => {
  it('lists inclusive Shanghai dates', () => {
    assert.deepEqual(eachDateInclusive('2024-01-01', '2024-01-03'), [
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
    ]);
  });

  it('uses the Shanghai day as the API window', () => {
    const { dayStart, dayEnd } = shanghaiDayBounds('2024-01-01');
    const win = awardPublishWindow('2024-01-01');
    assert.equal(win.publishDateBegin, dayStart);
    assert.equal(win.publishDateEnd, dayEnd - 1);
  });

  it('drops adjacent days and keeps the target day', () => {
    const { dayStart, dayEnd } = shanghaiDayBounds('2024-01-01');
    const items = [
      { publishDate: Date.parse('2024-01-01T10:00:00+08:00'), title: 'keep' },
      { publishDate: Date.parse('2023-12-31T23:00:00+08:00'), title: 'prev' },
      { publishDate: Date.parse('2024-01-02T00:10:00+08:00'), title: 'next' },
    ];
    assert.deepEqual(
      takeDayItems(items, dayStart, dayEnd, 0).map((it) => it.title),
      ['keep']
    );
  });

  it('treats a full-catalog first page as unfiltered', () => {
    const { dayStart, dayEnd } = shanghaiDayBounds('2024-01-01');
    const today = [{ publishDate: Date.parse('2026-09-28T08:00:00+08:00') }];
    assert.equal(listPageIsUnfiltered(75645, today, dayStart, dayEnd), true);
    assert.equal(listPageIsUnfiltered(0, [], dayStart, dayEnd), false);
  });

  it('pauses from 16:40 until 19:00 Shanghai', () => {
    assert.equal(msUntilBackfillResume(new Date('2026-10-08T15:00:00+08:00')), 0);
    assert.equal(msUntilBackfillResume(new Date('2026-10-08T19:00:00+08:00')), 0);
    const pause = msUntilBackfillResume(new Date('2026-10-08T16:40:00+08:00'));
    assert.equal(pause, 140 * 60 * 1000);
    assert.equal(msUntilBackfillResume(new Date('2026-10-08T17:30:00+08:00')), 90 * 60 * 1000);
  });

  it('blocks 17:00–19:00 Shanghai and refuses to include today', () => {
    const duringCollect = new Date('2026-09-28T17:05:00+08:00');
    const afternoon = new Date('2026-09-28T16:40:00+08:00');
    assert.equal(backfillQuietHoursBlocked(duringCollect), true);
    assert.equal(backfillQuietHoursBlocked(afternoon), false);
    assert.throws(
      () => assertBackfillAllowed({
        from: '2024-01-01',
        to: '2026-09-28',
        today: '2026-09-28',
        now: afternoon,
      }),
      /早于今天/
    );
    assert.throws(
      () => assertBackfillAllowed({
        from: '2024-01-01',
        to: '2024-01-01',
        today: '2026-09-28',
        now: duringCollect,
      }),
      /17:00/
    );
  });

  it('keeps backfill failures out of the daily retry list', () => {
    assert.equal(RETRY_STATUSES.includes(backfillFailureStatus()), false);
    assert.equal(RETRY_STATUSES.includes('backfill_pending'), false);
    assert.equal(shouldFetchDetail('backfill_failed'), false);
    assert.equal(shouldFetchDetail('backfill_pending'), false);
  });
});

describe('collectBackfillList', () => {
  it('pages until the filtered total is covered and ignores other days', async () => {
    const { dayStart } = shanghaiDayBounds('2024-01-02');
    const calls = [];
    const page = (n, publishDate) => ({
      articleId: String(n),
      publishDate,
      title: `n${n}`,
    });
    const fetchPage = async (opts) => {
      calls.push(opts);
      if (opts.pageNo === 1) {
        return {
          total: 60,
          items: [
            page(1, dayStart + 1000),
            page(2, dayStart - 1000),
          ],
        };
      }
      return { total: 60, items: [page(3, dayStart + 2000)] };
    };
    const list = await collectBackfillList('2024-01-02', { fetchPage, maxPages: 5 });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].publishDateBegin, dayStart);
    assert.deepEqual(list.items.map((it) => it.articleId), ['1', '3']);
    assert.equal(list.total, 60);
  });

  it('stops before insert when the first page is the live catalog', async () => {
    await assert.rejects(
      () => collectBackfillList('2024-01-01', {
        fetchPage: async () => ({
          total: 75645,
          items: [{ publishDate: Date.parse('2026-09-28T09:00:00+08:00') }],
        }),
      }),
      /日期过滤未生效/
    );
  });
});
