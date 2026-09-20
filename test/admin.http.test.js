import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createAdminServer } from '../src/admin/http.js';

const AUTH = { user: 'admin', pass: 'test-pass', secret: 'test-secret' };

function start(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

describe('admin http auth', () => {
  let server;
  let port;

  before(async () => {
    server = createAdminServer({
      auth: AUTH,
      pool: { query: async () => { throw new Error('db should not run on 401'); } },
    });
    port = await start(server);
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('returns 401 for /api/sales without cookie', async () => {
    const r = await fetch(`http://127.0.0.1:${port}/api/sales`);
    assert.equal(r.status, 401);
    const j = await r.json();
    assert.equal(j.error, '未登录');
  });

  it('rejects wrong password', async () => {
    const r = await fetch(`http://127.0.0.1:${port}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'nope' }),
    });
    assert.equal(r.status, 401);
  });
});
