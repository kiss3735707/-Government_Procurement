import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES } from '../src/config.js';
import { asJsonb, mapAttachments, mapListRow, nextProjectStage } from '../src/db/map.js';

const cat = CATEGORIES[0];

describe('mapListRow', () => {
  it('normalizes district and falls back purchaser to author', () => {
    const row = mapListRow(
      {
        articleId: 123,
        title: '测试公告',
        purchaseName: null,
        author: '上海市公安局普陀分局',
        districtName: '上海市普陀区',
        publishDate: Date.parse('2026-08-14T10:00:00+08:00'),
        pathName: '采购意向公开',
      },
      cat
    );
    assert.equal(row.site_code, 'sh-zfcg');
    assert.equal(row.article_id, '123');
    assert.equal(row.purchaser, '上海市公安局普陀分局');
    assert.equal(row.district_name, '普陀区');
    assert.equal(row.district_code, '310107');
    assert.equal(row.detail_status, 'pending');
  });
});

describe('mapAttachments', () => {
  it('maps name/url from zcy attachment objects', () => {
    const out = mapAttachments({
      attachmentDtoList: [{ fileName: '招标文件.pdf', fileUrl: 'https://example.com/a.pdf' }],
    });
    assert.deepEqual(out, [{ name: '招标文件.pdf', url: 'https://example.com/a.pdf' }]);
  });
});

describe('asJsonb', () => {
  it('parses JSON strings and keeps objects', () => {
    assert.deepEqual(asJsonb({ a: 1 }), { a: 1 });
    assert.deepEqual(asJsonb('{"a":1}'), { a: 1 });
    assert.deepEqual(asJsonb('{invalid'), { text: '{invalid' });
  });
});

describe('nextProjectStage', () => {
  it('does not move a project backwards', () => {
    assert.equal(nextProjectStage('award', 'bidding'), 'award');
    assert.equal(nextProjectStage('intention', 'bidding'), 'bidding');
  });
});
