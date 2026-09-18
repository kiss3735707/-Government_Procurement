import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchQuery, buildSummaryQuery, tagContains } from '../src/query/sql.js';

describe('tagContains', () => {
  it('only copies known tag dimensions', () => {
    assert.deepEqual(
      tagContains({ district: '普陀区', type: 'award', amountBand: '>1000万', ignore: 1 }),
      { district: '普陀区', type: 'award', amount_band: '>1000万' }
    );
  });
});

describe('buildSearchQuery', () => {
  it('uses jsonb containment for auto tags', () => {
    const { sql, params } = buildSearchQuery({
      district: '长宁区',
      type: 'intention',
      from: '2026-09-17',
      limit: 10,
    });
    assert.match(sql, /tags @> \$1::jsonb/);
    assert.equal(params[0], JSON.stringify({ district: '长宁区', type: 'intention' }));
    assert.equal(params[1], '2026-09-17');
    assert.equal(params[2], 10);
  });
});

describe('buildSummaryQuery', () => {
  it('reads v_daily_summary with optional day bounds', () => {
    const { sql, params } = buildSummaryQuery({ from: '2026-09-01', to: '2026-09-17' });
    assert.match(sql, /FROM v_daily_summary/);
    assert.deepEqual(params, ['2026-09-01', '2026-09-17']);
  });
});
