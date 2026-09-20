/**
 * 连库：销售 CRUD / CSV 报告 / 人工标签。测完删除测试行。
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { databaseUrl } from '../src/db/env.js';
import { migrate } from '../src/db/migrate.js';
import { closePool, getPool } from '../src/db/pool.js';
import { insertAnnouncementList } from '../src/db/store.js';
import { createAdminServer } from '../src/admin/http.js';

const enabled = Boolean(databaseUrl());
const PREFIX = `m5-${Date.now()}-`;
const EMAIL = `${PREFIX}sales@example.com`;
const AUTH = { user: 'admin', pass: 'test-pass', secret: 'test-secret' };

function start(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

async function login(port) {
  const r = await fetch(`http://127.0.0.1:${port}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: AUTH.user, password: AUTH.pass }),
  });
  assert.equal(r.status, 200);
  const cookie = String(r.headers.get('set-cookie') || '').split(';')[0];
  assert.match(cookie, /zfcg_admin=/);
  return cookie;
}

describe('admin integration', { skip: !enabled }, () => {
  let pool;
  let server;
  let port;
  let cookie;
  let announcementId;

  before(async () => {
    await migrate();
    pool = getPool();
    const ins = await insertAnnouncementList({
      site_code: 'sh-zfcg',
      article_id: `${PREFIX}1`,
      category_code: 'ZcyAnnouncement4',
      type: 'award',
      type_detail: '中标（成交）结果公告',
      title: 'M5标签测试公告',
      purchaser: '测试局',
      publisher: '测试局',
      district_name: '崇明区',
      district_code: '310151',
      publish_time: new Date('2026-09-17T04:00:00Z'),
      expired_at: null,
      detail_status: 'done',
      raw_json: { list: { articleId: `${PREFIX}1` } },
    }, pool);
    announcementId = ins.id;
    server = createAdminServer({ pool, auth: AUTH });
    port = await start(server);
    cookie = await login(port);
  });

  after(async () => {
    if (pool) {
      await pool.query(`DELETE FROM sales_regions WHERE sales_email = $1`, [EMAIL]);
      await pool.query(`DELETE FROM announcements WHERE article_id LIKE $1`, [`${PREFIX}%`]);
    }
    if (server) await new Promise((resolve) => server.close(resolve));
    await closePool();
  });

  it('creates, lists, then deletes a sales row', async () => {
    const created = await fetch(`http://127.0.0.1:${port}/api/sales`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ sales_name: '测试销售', sales_email: EMAIL, region: '崇明区' }),
    });
    assert.equal(created.status, 201);
    const row = (await created.json()).row;
    const listed = await fetch(`http://127.0.0.1:${port}/api/sales`, { headers: { cookie } });
    const rows = (await listed.json()).rows;
    assert.ok(rows.some((r) => r.id === row.id));
    const del = await fetch(`http://127.0.0.1:${port}/api/sales/${row.id}`, {
      method: 'DELETE',
      headers: { cookie },
    });
    assert.equal(del.status, 200);
  });

  it('imports one valid and one invalid csv row', async () => {
    const csv = [
      'sales_name,sales_email,region,note,is_active',
      `导入甲,${EMAIL},金山区,,true`,
      `导入乙,${EMAIL},火星区,,true`,
    ].join('\n');
    const r = await fetch(`http://127.0.0.1:${port}/api/sales/import`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ csv }),
    });
    const j = await r.json();
    assert.equal(j.success, 1);
    assert.equal(j.failed.length, 1);
    const exp = await fetch(`http://127.0.0.1:${port}/api/sales/export`, { headers: { cookie } });
    const text = await exp.text();
    assert.match(text, /sales_name,sales_email,region/);
    assert.match(text, /金山区/);
  });

  it('adds and removes a product_line tag', async () => {
    const add = await fetch(`http://127.0.0.1:${port}/api/announcements/${announcementId}/tags`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ tag_key: 'product_line', tag_value: '实验室设备' }),
    });
    assert.equal(add.status, 201);
    const tag = (await add.json()).row;
    const detail = await fetch(`http://127.0.0.1:${port}/api/announcements/${announcementId}`, {
      headers: { cookie },
    });
    const d = await detail.json();
    assert.ok(d.manual_tags.some((t) => String(t.id) === String(tag.id)));
    const rm = await fetch(`http://127.0.0.1:${port}/api/announcements/${announcementId}/tags/${tag.id}`, {
      method: 'DELETE',
      headers: { cookie },
    });
    assert.equal(rm.status, 200);
    const again = await fetch(`http://127.0.0.1:${port}/api/announcements/${announcementId}`, {
      headers: { cookie },
    });
    assert.equal((await again.json()).manual_tags.length, 0);
  });
});
