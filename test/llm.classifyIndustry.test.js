import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLY_INDUSTRY_SQL,
  buildIndustryClassifyPrompt,
  inGatewayQuiet,
  parseIndustryResult,
} from '../src/llm/classifyIndustry.js';

describe('industry classify', () => {
  it('accepts a dictionary industry and drops national-economy labels', () => {
    const result = parseIndustryResult('{"main_industry":"信息化数字化","sub_industry":["软件开发","批发和零售业"],"purchase_content_tags":["硒鼓","这是一段远远超过二十个字的采购内容说明不应该被保留下来"]}');
    assert.equal(result.main_industry, '信息化数字化');
    assert.deepEqual(result.sub_industry, ['软件开发']);
    assert.deepEqual(result.purchase_content_tags, ['硒鼓']);
  });

  it('rejects 未明确 and a national industry name', () => {
    assert.throws(() => parseIndustryResult('{"main_industry":"未明确"}'), /主行业不在字典中/);
    assert.throws(() => parseIndustryResult('{"main_industry":"批发和零售业"}'), /主行业不在字典中/);
  });

  it('prompt lists dictionary industries and the package names', () => {
    const prompt = buildIndustryClassifyPrompt({
      title: '关于硒鼓的成交公告',
      purchaser: '某学校',
      items: [{ item_name: '硒鼓' }],
    });
    assert.match(prompt, /关于硒鼓的成交公告/);
    assert.match(prompt, /1\. 硒鼓/);
    assert.match(prompt, /医疗卫生/);
    assert.match(prompt, /不要写「未明确」/);
  });

  it('update statement does not touch the deal amount', () => {
    assert.match(APPLY_INDUSTRY_SQL, /SET industry/);
    assert.equal(APPLY_INDUSTRY_SQL.includes('deal_amount'), false);
    assert.equal(APPLY_INDUSTRY_SQL.includes('supplier_name'), false);
  });

  it('keeps the gateway free from 19:40 until 21:00 Shanghai', () => {
    assert.equal(inGatewayQuiet(new Date('2026-10-22T19:39:00+08:00')), false);
    assert.equal(inGatewayQuiet(new Date('2026-10-22T19:40:00+08:00')), true);
    assert.equal(inGatewayQuiet(new Date('2026-10-22T20:10:00+08:00')), true);
    assert.equal(inGatewayQuiet(new Date('2026-10-22T21:00:00+08:00')), false);
  });
});
