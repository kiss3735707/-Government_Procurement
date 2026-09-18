/**
 * 连库集成测试：无 DATABASE_URL 时跳过。
 * 用独立 article_id 前缀，测完删除，不碰真实采集数据。
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { databaseUrl } from '../src/db/env.js';
import { migrate } from '../src/db/migrate.js';
import { closePool, getPool } from '../src/db/pool.js';
import { insertAnnouncementList, markDetailFailed } from '../src/db/store.js';
import { shouldFetchDetail } from '../src/db/status.js';

const enabled = Boolean(databaseUrl());
const PREFIX = `m2test-${Date.now()}-`;

describe('db integration', { skip: !enabled }, () => {
  let pool;

  before(async () => {
    await migrate();
    pool = getPool();
  });

  after(async () => {
    if (pool) {
      await pool.query(`DELETE FROM announcements WHERE article_id LIKE $1`, [`${PREFIX}%`]);
    }
    await closePool();
  });

  it('creates 7 tables and v_daily_summary', async () => {
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = ANY($1)
      ORDER BY 1
    `, [[
      'announcement_tags',
      'announcements',
      'collect_runs',
      'daily_digests',
      'intention_items',
      'projects',
      'sales_regions',
    ]]);
    assert.equal(tables.rowCount, 7);
    const views = await pool.query(`SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_daily_summary'`);
    assert.equal(views.rowCount, 1);
  });

  it('second insert of the same article is a no-op', async () => {
    const row = {
      site_code: 'sh-zfcg',
      article_id: `${PREFIX}dup`,
      category_code: 'ZcyAnnouncement10016',
      type: 'intention',
      type_detail: null,
      title: '幂等测试',
      purchaser: '测试采购人',
      publisher: '测试发布',
      district_name: '普陀区',
      district_code: '310107',
      publish_time: new Date('2026-08-14T02:00:00Z'),
      expired_at: null,
      detail_status: 'pending',
      raw_json: { list: { articleId: `${PREFIX}dup` } },
    };
    const first = await insertAnnouncementList(row, pool);
    const second = await insertAnnouncementList(row, pool);
    assert.equal(first.inserted, true);
    assert.equal(second.inserted, false);
    assert.equal(second.id, first.id);
    const cnt = await pool.query(
      `SELECT count(*)::int AS n FROM announcements WHERE article_id = $1`,
      [row.article_id]
    );
    assert.equal(cnt.rows[0].n, 1);
  });

  it('failed rows stay in the retry queue', async () => {
    const row = {
      site_code: 'sh-zfcg',
      article_id: `${PREFIX}fail`,
      category_code: 'ZcyAnnouncement2',
      type: 'bidding',
      type_detail: null,
      title: '失败重试',
      purchaser: null,
      publisher: null,
      district_name: '浦东新区',
      district_code: '310115',
      publish_time: new Date('2026-08-14T03:00:00Z'),
      expired_at: null,
      detail_status: 'pending',
      raw_json: { list: { articleId: `${PREFIX}fail` } },
    };
    const { id } = await insertAnnouncementList(row, pool);
    await markDetailFailed(id, { list: row.raw_json.list, error: 'boom' }, pool);
    const sel = await pool.query(`SELECT detail_status FROM announcements WHERE id = $1`, [id]);
    assert.equal(sel.rows[0].detail_status, 'failed');
    assert.equal(shouldFetchDetail(sel.rows[0].detail_status), true);
  });
});
