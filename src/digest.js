#!/usr/bin/env node
/**
 * M4 日报：
 *   node src/digest.js import-sales data/sales_regions.csv
 *   node src/digest.js run --date 2026-09-17
 *   node src/digest.js run --date 2026-09-17 --send
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { closePool } from './db/pool.js';
import { databaseUrl, smtpConfig } from './db/env.js';
import { todayShanghai } from './window.js';
import { parseSalesCsv } from './digest/csv.js';
import { buildDigestJobs } from './digest/jobs.js';
import { sendMail } from './digest/send.js';
import {
  claimDigest,
  importSalesRows,
  loadActiveSales,
  loadAnnouncementsForDay,
  markDigest,
} from './digest/store.js';

function parseArgs(argv) {
  const opts = { cmd: argv[0], date: null, send: false, file: null };
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--date') opts.date = argv[++i];
    else if (argv[i] === '--send') opts.send = true;
    else if (argv[i] === '--file') opts.file = argv[++i];
    else if (!argv[i].startsWith('--') && !opts.file) opts.file = argv[i];
  }
  return opts;
}

function summarize(jobs) {
  return jobs.map((j) => ({
    kind: j.kind,
    to: j.to,
    region: j.region,
    intention: j.intention,
    bidding: j.bidding,
    award: j.award,
    skipEmpty: j.skipEmpty,
    subject: j.mail.subject,
  }));
}

const opts = parseArgs(process.argv.slice(2));
if (!databaseUrl()) {
  console.error('需要 DATABASE_URL');
  process.exitCode = 1;
} else {
  try {
    if (opts.cmd === 'import-sales') {
      const file = resolve(opts.file || 'data/sales_regions.csv');
      const rows = parseSalesCsv(readFileSync(file, 'utf8'));
      const n = await importSalesRows(rows);
      console.log(JSON.stringify({ imported: n, file }, null, 2));
    } else if (opts.cmd === 'run') {
      const date = opts.date || todayShanghai();
      const cfg = smtpConfig();
      const [sales, announcements] = await Promise.all([
        loadActiveSales(),
        loadAnnouncementsForDay(date),
      ]);
      const jobs = buildDigestJobs({
        date,
        announcements,
        salesRows: sales,
        adminEmail: cfg.adminEmail,
      });
      const out = { date, dryRun: !opts.send, jobs: summarize(jobs) };
      if (!opts.send) {
        console.log(JSON.stringify(out, null, 2));
      } else {
        const results = [];
        for (const job of jobs) {
          const to = cfg.toOverride || job.to;
          if (job.skipEmpty) {
            results.push({ to, status: 'skipped_empty' });
            continue;
          }
          if (!to) {
            results.push({ to, status: 'failed', error: '无收件人' });
            continue;
          }
          const claimed = await claimDigest({
            report_date: date,
            sales_email: to,
            region: job.region,
            intention_cnt: job.intention,
            bidding_cnt: job.bidding,
            award_cnt: job.award,
          });
          if (!claimed) {
            results.push({ to, status: 'skipped_already_sent' });
            continue;
          }
          try {
            await sendMail({ to, subject: job.mail.subject, text: job.mail.text });
            await markDigest(claimed.id, { status: 'sent' });
            results.push({ to, from: cfg.fromEmail || cfg.user, status: 'sent' });
          } catch (err) {
            await markDigest(claimed.id, { status: 'failed', error: err.message });
            results.push({ to, status: 'failed', error: err.message });
          }
        }
        console.log(JSON.stringify({ ...out, dryRun: false, results }, null, 2));
      }
    } else {
      console.error('可用命令: import-sales <csv> | run [--date YYYY-MM-DD] [--send]');
      process.exitCode = 1;
    }
  } finally {
    await closePool().catch(() => {});
  }
}
