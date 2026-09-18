#!/usr/bin/env node
/**
 * M3 查询接口（JSON stdout）：
 *   node src/query.js search --district 长宁区 --type intention
 *   node src/query.js summary --from 2026-09-17 --to 2026-09-17
 *   node src/query.js by-district
 *   node src/query.js unassigned
 */
import { closePool } from './db/pool.js';
import { databaseUrl } from './db/env.js';
import {
  dailySummary,
  districtTypeSummary,
  searchAnnouncements,
  unassignedAnnouncements,
} from './query/repo.js';

function parseArgs(argv) {
  const opts = { cmd: argv[0] || 'search', limit: 50 };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--district') opts.district = argv[++i];
    else if (a === '--type') opts.type = argv[++i];
    else if (a === '--type-detail') opts.typeDetail = argv[++i];
    else if (a === '--amount-band') opts.amountBand = argv[++i];
    else if (a === '--year-month') opts.yearMonth = argv[++i];
    else if (a === '--from') opts.from = argv[++i];
    else if (a === '--to') opts.to = argv[++i];
    else if (a === '--limit') opts.limit = Number(argv[++i]) || 50;
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
if (!databaseUrl()) {
  console.error('需要 DATABASE_URL');
  process.exitCode = 1;
} else {
  try {
    let rows;
    if (opts.cmd === 'summary') rows = await dailySummary(opts);
    else if (opts.cmd === 'by-district') rows = await districtTypeSummary();
    else if (opts.cmd === 'unassigned') rows = await unassignedAnnouncements(opts);
    else if (opts.cmd === 'search' || !opts.cmd) rows = await searchAnnouncements(opts);
    else {
      console.error('未知命令。可用: search | summary | by-district | unassigned');
      process.exitCode = 1;
      rows = null;
    }
    if (rows) console.log(JSON.stringify(rows, null, 2));
  } finally {
    await closePool().catch(() => {});
  }
}
