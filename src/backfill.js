#!/usr/bin/env node
/**
 * 历史中标补采（不影响每日 17:00 的 src/index.js）：
 *   node src/backfill.js --from 2024-01-01 --to 2024-01-01
 *   node src/backfill.js --from 2024-01-01 --to 2024-01-07 --no-db
 *   --from/--to  上海自然日，含首尾。结束日默认须早于今天
 *   --limit      每天最多处理 N 条（0 = 当天全部）
 *   --no-db      只拉列表，不入库、不抓详情
 *   --force      允许在 17:00–19:00 或补到今天
 */
import { databaseUrl } from './db/env.js';
import { closePool } from './db/pool.js';
import { todayShanghai } from './window.js';
import { assertBackfillAllowed } from './backfill/plan.js';
import { runAwardBackfill } from './backfill/run.js';

function parseArgs(argv) {
  const opts = { from: null, to: null, limit: 0, db: null, force: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from') opts.from = argv[++i];
    else if (argv[i] === '--to') opts.to = argv[++i];
    else if (argv[i] === '--limit') opts.limit = Number(argv[++i]) || 0;
    else if (argv[i] === '--no-db') opts.db = false;
    else if (argv[i] === '--force') opts.force = true;
    else throw new Error(`未知参数 ${argv[i]}`);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
if (!opts.from || !opts.to) {
  console.error('用法: node src/backfill.js --from YYYY-MM-DD --to YYYY-MM-DD [--no-db] [--limit N] [--force]');
  process.exitCode = 1;
} else {
  const useDb = opts.db === false ? false : Boolean(databaseUrl());
  try {
    assertBackfillAllowed({
      from: opts.from,
      to: opts.to,
      today: todayShanghai(),
      force: opts.force,
    });
    if (opts.db !== false && !useDb) {
      console.warn('未设置 DATABASE_URL，本次只拉列表、不入库。');
    }
    console.log(`中标补采：${opts.from} → ${opts.to} limit=${opts.limit || '全量'} db=${useDb ? 'on' : 'off'}`);
    const result = await runAwardBackfill({
      from: opts.from,
      to: opts.to,
      limit: opts.limit,
      db: useDb,
    });
    const failed = result.results.filter((r) => r.error);
    const ok = result.results.filter((r) => !r.error);
    const inserted = ok.reduce((n, r) => n + (r.inserted || 0), 0);
    console.log(`补采结束 days=${ok.length} failedDays=${failed.length} inserted=${inserted}`);
    if (failed.length) process.exitCode = 1;
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await closePool().catch(() => {});
  }
}
