import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDigestJobs } from '../src/digest/jobs.js';

const anns = [
  { type: 'intention', title: '嘉定意向', district_name: '嘉定区' },
  { type: 'bidding', title: '长宁招标', district_name: '长宁区' },
  { type: 'award', title: '长宁中标', district_name: '长宁区' },
];

describe('buildDigestJobs', () => {
  it('falls back to DIGEST_ADMIN_EMAIL when nobody has 全市', () => {
    const jobs = buildDigestJobs({
      date: '2026-09-17',
      adminEmail: 'admin@example.com',
      salesRows: [{ sales_name: '赵海东', sales_email: 'a@qq.com', region: '嘉定区', is_active: true }],
      announcements: anns,
    });
    const salesJob = jobs.find((j) => j.kind === 'sales');
    const city = jobs.find((j) => j.kind === 'citywide');
    assert.equal(salesJob.items.length, 1);
    assert.equal(city.to, 'admin@example.com');
    assert.equal(city.intention + city.bidding + city.award, 3);
    assert.match(city.mail.subject, /全市/);
  });

  it('does not double-send when fallback admin is also a salesperson', () => {
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

  it('sends citywide to sales tagged 全市 including intention bidding award', () => {
    const jobs = buildDigestJobs({
      date: '2026-09-17',
      adminEmail: 'admin@example.com',
      salesRows: [
        { sales_name: '赵海东', sales_email: 'a@qq.com', region: '嘉定区', is_active: true },
        { sales_name: '赵海东', sales_email: 'a@qq.com', region: '全市', is_active: true },
      ],
      announcements: anns,
    });
    assert.equal(jobs.some((j) => j.kind === 'sales'), false);
    const city = jobs.filter((j) => j.kind === 'citywide');
    assert.equal(city.length, 1);
    assert.equal(city[0].to, 'a@qq.com');
    assert.equal(city[0].region, '全市');
    assert.equal(city[0].intention, 1);
    assert.equal(city[0].bidding, 1);
    assert.equal(city[0].award, 1);
    assert.equal(jobs.some((j) => j.to === 'admin@example.com'), false);
  });

  it('can send citywide to more than one salesperson', () => {
    const jobs = buildDigestJobs({
      date: '2026-09-17',
      adminEmail: 'admin@example.com',
      salesRows: [
        { sales_name: '甲', sales_email: 'a@qq.com', region: '全市', is_active: true },
        { sales_name: '乙', sales_email: 'b@qq.com', region: '全市', is_active: true },
      ],
      announcements: anns,
    });
    assert.deepEqual(
      jobs.filter((j) => j.kind === 'citywide').map((j) => j.to).sort(),
      ['a@qq.com', 'b@qq.com']
    );
  });
});
