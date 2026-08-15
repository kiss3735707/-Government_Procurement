#!/usr/bin/env node
/**
 * M1 采集 CLI：
 *   node src/index.js --date 2026-08-15 --limit 5
 *   --date   采集哪一天的公告（默认今天）
 *   --limit  每类最多抓 N 条（默认 0 = 全量当天）
 *   --no-save 不落盘（仅打印摘要）
 */
import { runCollect, saveResults } from './run.js';

function parseArgs(argv) {
  const opts = { date: null, limit: 0, save: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--date') opts.date = argv[++i];
    else if (argv[i] === '--limit') opts.limit = Number(argv[++i]) || 0;
    else if (argv[i] === '--no-save') opts.save = false;
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
console.log(`M1 采集启动：date=${opts.date ?? '今天'} limit=${opts.limit || '全量'}`);

const result = await runCollect(opts);
if (opts.save) {
  const path = await saveResults(result);
  console.log(`\n结果已保存: ${path}`);
}
