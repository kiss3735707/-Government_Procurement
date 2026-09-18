import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatWan, renderDigest } from '../src/digest/render.js';

describe('formatWan', () => {
  it('renders 1726000 as 172.6 万元', () => {
    assert.equal(formatWan(1726000), '172.6 万元');
    assert.equal(formatWan(null), '金额未知');
  });
});

describe('renderDigest', () => {
  it('includes three sections and 内部资料', () => {
    const { subject, text } = renderDigest({
      date: '2026-09-17',
      name: '赵海东',
      regions: ['嘉定区'],
      items: [
        {
          type: 'intention',
          title: '嘉定区某局意向',
          purchaser: '某局',
          items: [{ item_name: '设备', budget_amount: 500000, expect_month: '2026-10' }],
        },
      ],
    });
    assert.match(subject, /上海政府采购日报/);
    assert.match(subject, /赵海东/);
    assert.match(text, /一、新增采购意向（1 条）/);
    assert.match(text, /设备/);
    assert.match(text, /内部资料，请勿外传/);
  });
});
