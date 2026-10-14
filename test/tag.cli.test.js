import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTagArgs, resolveTagCli } from '../src/llm/tagCli.js';

describe('resolveTagCli', () => {
  it('tags the Shanghai today when --today is set', () => {
    const opts = parseTagArgs(['--today']);
    assert.deepEqual(resolveTagCli(opts, '2026-10-14'), {
      from: '2026-10-14',
      toInclusive: '2026-10-14',
      ranged: true,
    });
  });

  it('keeps an explicit range inclusive', () => {
    const opts = parseTagArgs(['--from', '2024-02-01', '--to', '2024-02-29']);
    assert.deepEqual(resolveTagCli(opts, '2026-10-14'), {
      from: '2024-02-01',
      toInclusive: '2024-02-29',
      ranged: true,
    });
  });

  it('rejects --today mixed with a date', () => {
    const opts = parseTagArgs(['--today', '--date', '2024-01-01']);
    assert.throws(() => resolveTagCli(opts, '2026-10-14'), /--today/);
  });
});
