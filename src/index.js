#!/usr/bin/env node
/**
 * 采集 CLI：
 *   node src/index.js --migrate
 *   node src/index.js --date 2026-08-14 --limit 2
 *   --date    采集哪一天（默认上海时区今天）
 *   --limit   每类最多抓 N 条（默认 0 = 全量当天）
 *   --no-save 不落盘 JSON
 *   --no-db   不入库（仅 JSON，DATABASE_URL 存在时默认入库）
 */
import { databaseUrl } from './db/env.js';
import { closePool } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { runCollect, saveResults } from './run.js';

function parseArgs(argv) {
  const opts = { date: null, limit: 0, save: true, db: null, migrate: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--date') opts.date = argv[++i];
    else if (argv[i] === '--limit') opts.limit = Number(argv[++i]) || 0;
    else if (argv[i] === '--no-save') opts.save = false;
    else if (argv[i] === '--no-db') opts.db = false;
    else if (argv[i] === '--migrate') opts.migrate = true;
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const hasDb = Boolean(databaseUrl());
const useDb = opts.db === false ? false : hasDb;

try {
  if (opts.migrate) {
    if (!hasDb) {
      console.error('migrate 需要 DATABASE_URL');
      process.exitCode = 1;
    } else {
      await migrate();
      console.log('migrate ok');
    }
  } else {
    if (opts.db !== false && !hasDb) {
      console.warn('未设置 DATABASE_URL，本次只落盘 JSON、不入库。');
    }
    console.log(
      `M2 采集启动：date=${opts.date ?? '今天(上海)'} limit=${opts.limit || '全量'} db=${useDb ? 'on' : 'off'}`
    );
    const result = await runCollect({ date: opts.date, limit: opts.limit, db: useDb });
    if (opts.save) {
      const path = await saveResults(result);
      console.log(`\n结果已保存: ${path}`);
    }
  }
} finally {
  await closePool().catch(() => {});
}
