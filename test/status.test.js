import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nextDetailStatus, shouldFetchDetail } from '../src/db/status.js';

describe('nextDetailStatus', () => {
  it('marks done when detail payload exists', () => {
    assert.equal(nextDetailStatus({ detail: { content: '<p>x</p>' } }), 'done');
  });

  it('marks failed on fetch error', () => {
    assert.equal(nextDetailStatus({ detail: null, fetchError: new Error('timeout') }), 'failed');
  });

  it('marks failed when detail is empty', () => {
    assert.equal(nextDetailStatus({ detail: null }), 'failed');
  });
});

describe('shouldFetchDetail', () => {
  it('retries pending and failed, skips done and backfill statuses', () => {
    assert.equal(shouldFetchDetail('pending'), true);
    assert.equal(shouldFetchDetail('failed'), true);
    assert.equal(shouldFetchDetail('done'), false);
    assert.equal(shouldFetchDetail('backfill_pending'), false);
    assert.equal(shouldFetchDetail('backfill_failed'), false);
  });
});
