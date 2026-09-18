import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { databaseUrl } from '../src/db/env.js';
import { migrate } from '../src/db/migrate.js';
import { closePool, getPool } from '../src/db/pool.js';
import { insertAnnouncementList } from '../src/db/store.js';
import { searchAnnouncements } from '../src/query/repo.js';

const enabled = Boolean(databaseUrl());
const PREFIX = `m3q-${Date.now()}-`;

describe('query integration', { skip: !enabled }, () => {
  let pool;
  let id;

  before(async () => {
    await migrate();
    pool = getPool();
    const row = {
      site_code: 'sh-zfcg',
      article_id: `${PREFIX}1`,
      category_code: 'ZcyAnnouncement4',
      type: 'award',
      type_detail: '中标（成交）结果公告',
      title: 'M3查询测试公告',
      purchaser: '测试局',
      publisher: '测试局',
      district_name: '静安区',
      district_code: '310106',
      publish_time: new Date('2026-09-17T04:00:00Z'),
      expired_at: null,
      detail_status: 'done',
      raw_json: { list: { articleId: `${PREFIX}1` } },
    };
    const ins = await insertAnnouncementList(row, pool);
    id = ins.id;
    await pool.query(
      `UPDATE announcements SET tags = $2::jsonb WHERE id = $1`,
      [id, JSON.stringify({ type: 'award', district: '静安区', amount_band: '50-200万', year_month: '2026-09' })]
    );
  });

  after(async () => {
    if (pool) {
      await pool.query(`DELETE FROM announcements WHERE article_id LIKE $1`, [`${PREFIX}%`]);
    }
    await closePool();
  });

  it('finds the row by tags containment', async () => {
    const rows = await searchAnnouncements({
      district: '静安区',
      type: 'award',
      from: '2026-09-17',
      to: '2026-09-17',
      limit: 20,
    });
    assert.ok(rows.some((r) => r.article_id === `${PREFIX}1`));
  });
});
