import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assignAnnouncements, countByType, standardRegion } from '../src/digest/match.js';

describe('standardRegion', () => {
  it('normalizes 上海市嘉定区 to 嘉定区', () => {
    assert.equal(standardRegion('上海市嘉定区'), '嘉定区');
    assert.equal(standardRegion('嘉定区'), '嘉定区');
  });
});

describe('assignAnnouncements', () => {
  const sales = [
    { sales_name: '赵海东', sales_email: 'a@qq.com', region: '嘉定区', is_active: true },
  ];

  it('routes 嘉定区 to the owner and others to unassigned', () => {
    const { bundles, unassigned } = assignAnnouncements(
      [
        { title: '嘉定意向', type: 'intention', district_name: '嘉定区' },
        { title: '长宁意向', type: 'intention', district_name: '长宁区' },
      ],
      sales
    );
    const zhao = bundles.find((b) => b.sales_email === 'a@qq.com');
    assert.equal(zhao.items.length, 1);
    assert.equal(zhao.items[0].title, '嘉定意向');
    assert.equal(unassigned.length, 1);
    assert.equal(unassigned[0].title, '长宁意向');
  });
});

describe('countByType', () => {
  it('counts three categories', () => {
    assert.deepEqual(
      countByType([{ type: 'intention' }, { type: 'award' }, { type: 'award' }]),
      { intention: 1, bidding: 0, award: 2 }
    );
  });
});
