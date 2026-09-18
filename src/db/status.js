/** detail_status 状态机：pending → done | failed；failed 下次任务再进 pending 重试队列。 */

export const DETAIL_PENDING = 'pending';
export const DETAIL_DONE = 'done';
export const DETAIL_FAILED = 'failed';

export const RETRY_STATUSES = [DETAIL_PENDING, DETAIL_FAILED];

/**
 * 详情抓取结束后的下一状态。
 * @param {{ detail: object|null, fetchError?: Error|null }} ctx
 */
export function nextDetailStatus({ detail, fetchError }) {
  if (fetchError || !detail) return DETAIL_FAILED;
  return DETAIL_DONE;
}

/** 该行是否应在本次任务抓详情（含次日对 failed 的重试） */
export function shouldFetchDetail(status) {
  return status === DETAIL_PENDING || status === DETAIL_FAILED;
}
