import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INSERT_ANNOUNCEMENT_SQL } from '../src/db/store.js';

describe('INSERT_ANNOUNCEMENT_SQL', () => {
  it('uses unique key conflict do nothing', () => {
    const sql = INSERT_ANNOUNCEMENT_SQL.replace(/\s+/g, ' ');
    assert.match(sql, /ON CONFLICT \(site_code, article_id\) DO NOTHING/);
  });
});
