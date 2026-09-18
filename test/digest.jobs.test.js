import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDigestJobs } from '../src/digest/jobs.js';

describe('buildDigestJobs', () => {
  it('sends all city announcements to admin', () => {
    const jobs = buildDigestJobs({
      date: '2026-09-17',
      adminEmail: 'admin@example.com',
      salesRows: [{ sales_name: '赵海东', sales_email: 'a@qq.com', region: '嘉定区', is_active: true }],
      announcements: [
        { type: 'award', title: '长宁中标', district_name: '长宁区' },
        { type: 'intention', title: '嘉定意向', district_name: '嘉定区' },
      ],
    });
    const salesJob = jobs.find((j) => j.kind === 'sales');
    const city = jobs.find((j) => j.kind === 'citywide');
    assert.equal(salesJob.items.length, 1);
    assert.equal(city.to, 'admin@example.com');
    assert.equal(city.intention + city.award, 2);
    assert.match(city.mail.subject, /全市/);
  });

  it('does not double-send when admin is also a salesperson', () => {
    const jobs = buildDigestJobs({
      date: '2026-09-17',
      adminEmail: 'a@qq.com',
      salesRows: [{ sales_name: '赵海东', sales_email: 'a@qq.com', region: '嘉定区', is_active: true }],
      announcements: [{ type: 'award', title: '长宁中标', district_name: '长宁区' }],
    });
    assert.equal(jobs.some((j) => j.kind === 'sales'), false);
    assert.equal(jobs[0].kind, 'citywide');
    assert.equal(jobs[0].to, 'a@qq.com');
    assert.equal(jobs[0].award, 1);
  });
});
