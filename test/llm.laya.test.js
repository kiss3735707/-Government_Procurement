import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildLayaState, industryFromLaya, industryQuestion } from '../src/llm/layaClient.js';
import { APPLY_INDUSTRY_SQL } from '../src/llm/classifyIndustry.js';

describe('laya industry', () => {
  it('keeps the state short and names the title', () => {
    const state = buildLayaState({
      title: '关于硒鼓的成交公告',
      purchaser: '某学校',
      items: Array.from({ length: 12 }, (_, index) => ({ item_name: `物品${index}` })),
    });
    assert.match(state, /关于硒鼓的成交公告/);
    assert.match(state, /物品7/);
    assert.equal(state.includes('物品8'), false);
  });

  it('asks for one choice among the dictionary industries', () => {
    const question = industryQuestion();
    assert.equal(question.type, 'choice');
    assert.equal(question.criteria['医疗卫生'], '医院、药品、医疗设备和卫生服务');
    assert.equal(Object.keys(question.criteria).length, 19);
  });

  it('maps a confident choice and sends a weak one to 其他', () => {
    const sure = industryFromLaya({
      answers: { industry: { choice: '医疗卫生', confidence: 0.8 } },
    });
    assert.equal(sure.main_industry, '医疗卫生');
    assert.deepEqual(sure.purchase_content_tags, []);
    const weak = industryFromLaya({
      answers: { industry: { choice: '教育', probabilities: { 教育: 0.2, 其他: 0.1 } } },
    });
    assert.equal(weak.main_industry, '其他');
    assert.equal(weak.raw_choice, '教育');
  });

  it('rejects a label outside the dictionary', () => {
    assert.throws(
      () => industryFromLaya({ answers: { industry: { choice: '批发和零售业', confidence: 0.9 } } }),
      /字典外/,
    );
  });

  it('the write path still leaves the deal amount alone', () => {
    assert.equal(APPLY_INDUSTRY_SQL.includes('deal_amount'), false);
  });
});
