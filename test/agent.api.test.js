import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createAdminServer } from '../src/admin/http.js';
import { buildAwardStatsQuery, buildListQuery } from '../src/agent/sql.js';
import { parseStatsQuery } from '../src/agent/params.js';

const AUTH = { user: 'admin', pass: 'test-pass', secret: 'test-secret' };

function start(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

describe('agent sql', () => {
  it('sums package deal amounts and not the announcement header', () => {
    const filters = parseStatsQuery(new URLSearchParams('group=supplier&from=2024-01-01&to=2024-12-31'));
    const { sql } = buildAwardStatsQuery(filters);
    assert.match(sql, /sum\(p\.deal_amount\)/);
    assert.equal(sql.includes('award_amount'), false);
    assert.match(sql, /ai\.status = 'done'/);
  });

  it('list query does not return the body or model payload', () => {
    const { sql } = buildListQuery({
      type: 'award',
      from: null,
      to: null,
      district: null,
      industry: null,
      supplier: '甲公司',
      contentTag: null,
      limit: 20,
      offset: 0,
    });
    assert.equal(sql.includes('content_text'), false);
    assert.equal(sql.includes('payload'), false);
    assert.match(sql, /p\.supplier_name/);
  });
});

describe('agent http', () => {
  let server;
  let port;
  const calls = [];

  before(async () => {
    server = createAdminServer({
      auth: AUTH,
      agentToken: 'agent-secret',
      pool: {
        query: async (sql) => {
          calls.push(sql);
          if (/\bAS n\b/.test(sql)) return { rows: [{ n: 0 }] };
          if (sql.includes('content_text')) return { rows: [] };
          return { rows: [] };
        },
      },
    });
    port = await start(server);
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('rejects a missing token and an admin cookie', async () => {
    const bare = await fetch(`http://127.0.0.1:${port}/api/agent/stats?group=supplier`);
    assert.equal(bare.status, 401);
    assert.equal((await bare.json()).error, 'unauthorized');
    const cookie = await fetch(`http://127.0.0.1:${port}/api/agent/stats?group=supplier`, {
      headers: { cookie: 'zfcg_session=nope' },
    });
    assert.equal(cookie.status, 401);
  });

  it('rejects writes and a district named 全市', async () => {
    const posted = await fetch(`http://127.0.0.1:${port}/api/agent/announcements`, {
      method: 'POST',
      headers: { authorization: 'Bearer agent-secret' },
    });
    assert.equal(posted.status, 405);
    const bad = await fetch(`http://127.0.0.1:${port}/api/agent/stats?group=supplier&district=${encodeURIComponent('全市')}`, {
      headers: { authorization: 'Bearer agent-secret' },
    });
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error, '参数错误');
  });

  it('returns an empty supplier summary for a valid token', async () => {
    const r = await fetch(`http://127.0.0.1:${port}/api/agent/stats?group=supplier&from=2024-01-01&to=2024-01-31`, {
      headers: { authorization: 'Bearer agent-secret' },
    });
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.amount_basis, 'package');
    assert.deepEqual(body.rows, []);
    assert.equal(calls.some((sql) => sql.includes('deal_amount')), true);
  });
});
