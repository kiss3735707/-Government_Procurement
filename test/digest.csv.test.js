import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSalesCsv } from '../src/digest/csv.js';

describe('parseSalesCsv', () => {
  it('parses template header and skips empty region', () => {
    const rows = parseSalesCsv(
      'sales_name,sales_email,region,note,is_active\n赵海东,a@qq.com,嘉定区,,true\n,,,\n'
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].sales_name, '赵海东');
    assert.equal(rows[0].region, '嘉定区');
    assert.equal(rows[0].is_active, true);
  });
});
