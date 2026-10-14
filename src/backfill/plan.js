/**
 * 历史中标补采的纯逻辑：日期范围、毫秒窗口、安静时段、未过滤检测。
 * 不访问网络，不写库。
 */
import { CATEGORIES } from '../config.js';
import { inPublishWindow, shanghaiDayBounds } from '../window.js';
import { DETAIL_BACKFILL_FAILED, DETAIL_BACKFILL_PENDING } from '../db/status.js';

export const AWARD_CATEGORY = CATEGORIES.find((c) => c.type === 'award');

const DAY_MS = 24 * 3600 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function eachDateInclusive(from, to) {
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    throw new Error('日期格式须为 YYYY-MM-DD');
  }
  if (from > to) throw new Error('from 不能晚于 to');
  const dates = [];
  let cur = from;
  while (cur <= to) {
    dates.push(cur);
    cur = addShanghaiDay(cur);
  }
  return dates;
}

export function addShanghaiDay(ymd) {
  const next = new Date(`${ymd}T00:00:00+08:00`).getTime() + DAY_MS;
  return new Date(next).toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
}

/**
 * 传给列表接口的毫秒窗口。
 * 实测：end 传「次日 00:00」会落到次日；end 须落在目标日的 23:59:59.999。
 * 入库仍用 [dayStart, dayEnd) 做客户端过滤。
 */
export function awardPublishWindow(date) {
  const { dayStart, dayEnd } = shanghaiDayBounds(date);
  return { publishDateBegin: dayStart, publishDateEnd: dayEnd - 1, dayStart, dayEnd };
}

export function shanghaiHourMinute(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const pick = (type) => Number(parts.find((p) => p.type === type)?.value);
  return { hour: pick('hour'), minute: pick('minute') };
}

export function shanghaiHour(now = new Date()) {
  return shanghaiHourMinute(now).hour;
}

/** 17:00–19:00 与每日采集、日报重叠。 */
export function backfillQuietHoursBlocked(now = new Date()) {
  const hour = shanghaiHour(now);
  return hour >= 17 && hour < 19;
}

/**
 * 16:40 起不再开新的一天，等到 19:00。
 * 给当天采集留出启动前的空档，避免补采还在请求源站。
 * @returns {number} 需要等待的毫秒；0 表示可以继续
 */
export function msUntilBackfillResume(now = new Date()) {
  const { hour, minute } = shanghaiHourMinute(now);
  const pause = (hour === 16 && minute >= 40) || (hour >= 17 && hour < 19);
  if (!pause) return 0;
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const resumeAt = new Date(`${day}T19:00:00+08:00`).getTime();
  return Math.max(0, resumeAt - now.getTime());
}

export function assertBackfillAllowed({ from, to, today, force = false, now = new Date() }) {
  eachDateInclusive(from, to);
  if (backfillQuietHoursBlocked(now) && !force) {
    throw new Error('17:00–19:00 不跑补采，避开每日采集和日报。确认要跑时加 --force');
  }
  if (to >= today && !force) {
    throw new Error(`补采结束日须早于今天 ${today}，避免和当天采集抢同一天。确认要跑时加 --force`);
  }
}

/**
 * 第一页若像「没按日期过滤的全库」，立即停下，避免从今天往历史翻。
 * 空日（total=0）不是未过滤。
 */
export function listPageIsUnfiltered(total, items, dayStart, dayEnd) {
  if (total > 5000) return true;
  if (!items?.length) return false;
  return items.every((it) => !inPublishWindow(it.publishDate, dayStart, dayEnd));
}

export function takeDayItems(items, dayStart, dayEnd, limit, already = 0) {
  const out = [];
  for (const it of items) {
    if (!inPublishWindow(it.publishDate, dayStart, dayEnd)) continue;
    if (limit && already + out.length >= limit) break;
    out.push(it);
  }
  return out;
}

export async function collectBackfillList(date, { limit = 0, fetchPage, maxPages = 20 } = {}) {
  const { publishDateBegin, publishDateEnd, dayStart, dayEnd } = awardPublishWindow(date);
  const matched = [];
  let total = 0;
  let pages = 0;
  for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
    const page = await fetchPage({
      pageNo,
      pageSize: 50,
      publishDateBegin,
      publishDateEnd,
    });
    pages = pageNo;
    total = page.total ?? 0;
    const items = page.items ?? [];
    if (pageNo === 1 && listPageIsUnfiltered(total, items, dayStart, dayEnd)) {
      const err = new Error(`日期过滤未生效 ${date} total=${total}，已停止，未入库`);
      err.code = 'UNFILTERED';
      throw err;
    }
    if (items.length === 0) break;
    matched.push(...takeDayItems(items, dayStart, dayEnd, limit, matched.length));
    if (limit && matched.length >= limit) break;
    if (pageNo * 50 >= total) break;
  }
  return { date, total, pages, items: matched };
}

export function backfillListStatus() {
  return DETAIL_BACKFILL_PENDING;
}

export function backfillFailureStatus() {
  return DETAIL_BACKFILL_FAILED;
}
