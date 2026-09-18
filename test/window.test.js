import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inPublishWindow, shanghaiDayBounds, todayShanghai } from '../src/window.js';

describe('shanghaiDayBounds', () => {
  it('cuts a Shanghai calendar day in UTC milliseconds', () => {
    const { dayStart, dayEnd } = shanghaiDayBounds('2026-08-14');
    assert.equal(dayStart, Date.parse('2026-08-14T00:00:00+08:00'));
    assert.equal(dayEnd - dayStart, 24 * 3600 * 1000);
  });
});

describe('inPublishWindow', () => {
  const { dayStart, dayEnd } = shanghaiDayBounds('2026-08-14');

  it('keeps publishDate on the target day', () => {
    assert.equal(inPublishWindow(Date.parse('2026-08-14T17:00:00+08:00'), dayStart, dayEnd), true);
  });

  it('drops adjacent-day records that the API mixes in', () => {
    assert.equal(inPublishWindow(Date.parse('2026-08-15T00:30:00+08:00'), dayStart, dayEnd), false);
    assert.equal(inPublishWindow(Date.parse('2026-08-13T23:59:59+08:00'), dayStart, dayEnd), false);
  });

  it('rejects missing timestamps', () => {
    assert.equal(inPublishWindow(null, dayStart, dayEnd), false);
  });
});

describe('todayShanghai', () => {
  it('returns YYYY-MM-DD', () => {
    assert.match(todayShanghai(), /^\d{4}-\d{2}-\d{2}$/);
  });
});
