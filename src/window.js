/**
 * 采集窗口：按 Asia/Shanghai 自然日切分。
 * 客户端必须用 publishDate 过滤，不能依赖接口 beginDate/endDate。
 */

/** @returns {string} YYYY-MM-DD（上海时区的今天） */
export function todayShanghai() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
}

/**
 * @param {string} date YYYY-MM-DD
 * @returns {{ dayStart: number, dayEnd: number }} 毫秒时间戳
 */
export function shanghaiDayBounds(date) {
  const dayStart = new Date(`${date}T00:00:00+08:00`).getTime();
  return { dayStart, dayEnd: dayStart + 24 * 3600 * 1000 };
}

/**
 * 列表项是否落在目标上海自然日。
 * @param {number|null|undefined} publishDate 源站毫秒时间戳
 * @param {number} dayStart
 * @param {number} dayEnd
 */
export function inPublishWindow(publishDate, dayStart, dayEnd) {
  if (publishDate == null) return false;
  return publishDate >= dayStart && publishDate < dayEnd;
}
