import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  chatCompletionsUrl,
  maskApiKey,
  normalizeLlmInput,
  redactSecret,
  resolveApiKey,
} from '../src/llm/settings.js';
import { testLlmConnection } from '../src/llm/client.js';

describe('llm settings', () => {
  it('masks the key and keeps a blank input from overwriting it', () => {
    assert.equal(maskApiKey('sk-secret-1234'), '****1234');
    assert.equal(maskApiKey(''), '');
    assert.equal(resolveApiKey('', 'saved-key'), 'saved-key');
    assert.equal(resolveApiKey('****1234', 'saved-key'), 'saved-key');
    assert.equal(resolveApiKey('new-key', 'saved-key'), 'new-key');
  });

  it('builds the chat completions url and omits the key from errors', () => {
    assert.equal(chatCompletionsUrl('http://gw:8002/v1/'), 'http://gw:8002/v1/chat/completions');
    assert.equal(redactSecret('bad key sk-abc', 'sk-abc'), 'bad key ***');
  });

  it('defaults reasoning to off', () => {
    const row = normalizeLlmInput({ baseUrl: 'http://gw/v1', apiKey: 'k', model: 'm' }, {});
    assert.equal(row.reasoning, 'off');
  });
});

describe('testLlmConnection', () => {
  it('does not send reasoning when off, and hides the key on failure', async () => {
    let seen;
    const out = await testLlmConnection(
      { baseUrl: 'http://gw/v1', apiKey: 'sk-secret', model: 'm', reasoning: 'off' },
      {
        fetchImpl: async (url, opts) => {
          seen = { url, opts };
          return { ok: false, status: 401, text: async () => 'invalid sk-secret' };
        },
      }
    );
    assert.equal(seen.url, 'http://gw/v1/chat/completions');
    assert.equal(JSON.parse(seen.opts.body).reasoning_effort, 'none');
    assert.equal(seen.opts.headers.authorization, 'Bearer sk-secret');
    assert.equal(out.ok, false);
    assert.equal(out.message.includes('sk-secret'), false);
  });

  it('returns a clear failure when the key is missing', async () => {
    const out = await testLlmConnection({ baseUrl: 'http://gw/v1', apiKey: '', model: 'm', reasoning: 'off' });
    assert.equal(out.ok, false);
    assert.match(out.message, /api_key/);
  });
});
