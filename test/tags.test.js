import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { amountBand, buildTags } from '../src/tags.js';

describe('amountBand', () => {
  it('maps thresholds used by DESIGN', () => {
    assert.equal(amountBand(null), null);
    assert.equal(amountBand(499999), '<50万');
    assert.equal(amountBand(500000), '50-200万');
    assert.equal(amountBand(10000000), '>1000万');
  });
});

describe('buildTags', () => {
  it('sets district, shanghai year_month and has_attachment', () => {
    const tags = buildTags({
      type: 'award',
      typeDetail: '中标（成交）结果公告',
      districtName: '上海市长宁区',
      purchaser: '测试采购人',
      publishTime: Date.parse('2026-09-17T09:00:00+08:00'),
      parsed: { awardAmount: 800000, suppliers: ['甲公司'] },
      detail: { attachmentDtoList: [{ fileName: 'a.pdf' }] },
    });
    assert.equal(tags.district, '长宁区');
    assert.equal(tags.year_month, '2026-09');
    assert.equal(tags.amount_band, '50-200万');
    assert.equal(tags.has_attachment, true);
    assert.equal(tags.supplier, '甲公司');
  });
});
