#!/usr/bin/env node
/**
 * 中标 AI 打标。不改 announcements.tags，不发信。
 *   node src/tag-awards.js --today
 *   node src/tag-awards.js --date 2024-01-01 --limit 3
 *   node src/tag-awards.js --from 2024-01-01 --to 2024-01-31
 *   --today  上海时区今天。已成功和已放弃的会跳过
 *   --date   只打这一天
 *   --from/--to  上海自然日，含首尾
 *   --limit  最多条数。单日默认 3；--today 和日期范围默认不截断
 */
import { closePool, getPool } from './db/pool.js';
import { databaseUrl } from './db/env.js';
import { todayShanghai } from './window.js';
import { addShanghaiDay } from './backfill/plan.js';
import { parseTagArgs, resolveTagCli } from './llm/tagCli.js';
import { listUntaggedAwards, tagAwardRows } from './llm/tagRun.js';

let opts;
let range;
try {
  opts = parseTagArgs(process.argv.slice(2));
  range = resolveTagCli(opts, todayShanghai());
} catch (err) {
  console.error(err.message);
  console.error('用法: node src/tag-awards.js --today');
  console.error('  或: node src/tag-awards.js --date YYYY-MM-DD [--limit N]');
  console.error('  或: node src/tag-awards.js --from YYYY-MM-DD --to YYYY-MM-DD');
  process.exitCode = 1;
}

if (!range) {
  // 参数错误已在上面打印
} else if (!databaseUrl()) {
  console.error('需要 DATABASE_URL');
  process.exitCode = 1;
} else {
  const { from, toInclusive, ranged } = range;
  const limit = opts.limit == null ? (ranged ? 100000 : 3) : opts.limit;
  try {
    const pool = getPool();
    const rows = await listUntaggedAwards(pool, {
      from,
      to: addShanghaiDay(toInclusive),
      limit,
    });
    console.log(`待打标 ${rows.length} 条 @ ${from} → ${toInclusive}`);
    const results = await tagAwardRows(pool, rows);
    const failed = results.filter((r) => r.status === 'failed').length;
    console.log(`打标结束 done=${results.length - failed} failed=${failed}`);
    if (failed) process.exitCode = 1;
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await closePool().catch(() => {});
  }
}
