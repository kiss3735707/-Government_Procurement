import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAwardTagPrompt, packagesFromPayload, parseModelJson } from '../src/llm/tagAward.js';
import { TAG_MAX_TOKENS, completeChat } from '../src/llm/tagRun.js';

describe('award tag parse', () => {
  it('reads fenced JSON and builds one package row per result item', () => {
    const payload = parseModelJson('```json\n{"result_items":[{"item_index":1,"item_name":"养护","supplier_name":"甲公司","deal_amount":"1000.50"}],"industry":{"main_industry":"交通"},"purchase_content_tags":["公路养护"]}\n```');
    const rows = packagesFromPayload(payload);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].supplier_name, '甲公司');
    assert.equal(rows[0].deal_amount, 1000.5);
    assert.equal(rows[0].industry, '交通');
    assert.deepEqual(rows[0].content_tags, ['公路养护']);
  });

  it('rejects a response without result_items', () => {
    assert.throws(() => parseModelJson('{"announcement":{}}'), /result_items/);
  });

  it('prompt includes the title and does not ask to rewrite rule tags', () => {
    const prompt = buildAwardTagPrompt({ title: '示例中标公告', content_text: '成交金额 100 元' });
    assert.match(prompt, /示例中标公告/);
    assert.match(prompt, /result_items/);
    assert.match(prompt, /信息化数字化/);
    assert.match(prompt, /主行业不要写「未明确」/);
  });
});

describe('award tag output limit', () => {
  it('asks for 8000 completion tokens and stays far under the 500k context', async () => {
    assert.equal(TAG_MAX_TOKENS, 8000);
    assert.ok(TAG_MAX_TOKENS < 50000);
    let body;
    const text = await completeChat(
      { baseUrl: 'http://gw/v1', apiKey: 'k', model: 'm', reasoning: 'off' },
      'prompt',
      {
        fetchImpl: async (_url, opts) => {
          body = JSON.parse(opts.body);
          return { ok: true, text: async () => '{"choices":[{"message":{"content":"{}"}}]}' };
        },
      }
    );
    assert.equal(body.max_tokens, 8000);
    assert.equal(text, '{}');
  });
});
