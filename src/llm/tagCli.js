/**
 * 打标命令的参数。不连库、不调用模型。
 * --today 表示上海时区的今天，给每天 20:00 的定时任务用。
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseTagArgs(argv) {
  const opts = { date: null, from: null, to: null, limit: null, today: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--date') opts.date = argv[++i];
    else if (argv[i] === '--from') opts.from = argv[++i];
    else if (argv[i] === '--to') opts.to = argv[++i];
    else if (argv[i] === '--limit') opts.limit = Number(argv[++i]) || 0;
    else if (argv[i] === '--today') opts.today = true;
    else throw new Error(`未知参数 ${argv[i]}`);
  }
  return opts;
}

/**
 * @returns {{ from: string, toInclusive: string, ranged: boolean }}
 * ranged 为真时调用方不截断条数（定时任务要打完当天）。
 */
export function resolveTagCli(opts, today) {
  if (opts.today) {
    if (opts.date || opts.from || opts.to) {
      throw new Error('--today 不能和 --date、--from、--to 一起用');
    }
    return { from: today, toInclusive: today, ranged: true };
  }
  const from = opts.from || opts.date;
  const toInclusive = opts.to || opts.date;
  const ranged = Boolean(opts.from || opts.to);
  if (!from || !toInclusive || !DATE_RE.test(from) || !DATE_RE.test(toInclusive) || from > toInclusive) {
    throw new Error('日期无效');
  }
  return { from, toInclusive, ranged };
}
