import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapPool, TAG_CONCURRENCY } from '../src/llm/tagRun.js';

describe('mapPool', () => {
  it('keeps at most 3 running and preserves order', async () => {
    assert.equal(TAG_CONCURRENCY, 3);
    let active = 0;
    let max = 0;
    const results = await mapPool([1, 2, 3, 4, 5, 6], TAG_CONCURRENCY, async (n) => {
      active += 1;
      max = Math.max(max, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      active -= 1;
      return n * 10;
    });
    assert.equal(max, 3);
    assert.deepEqual(results, [10, 20, 30, 40, 50, 60]);
  });
});
