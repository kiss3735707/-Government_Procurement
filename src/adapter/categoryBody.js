/**
 * 列表接口请求体。每日采集只传 beginDate/endDate；
 * 历史补采另传 publishDateBegin/publishDateEnd（毫秒），不走每日那条路径。
 */
export function buildCategoryBody({
  parentId,
  categoryCode,
  pageNo,
  pageSize,
  beginDate,
  endDate,
  publishDateBegin,
  publishDateEnd,
}) {
  const body = { parentId, categoryCode, pageNo, pageSize };
  if (beginDate) body.beginDate = beginDate;
  if (endDate) body.endDate = endDate;
  if (publishDateBegin != null) body.publishDateBegin = publishDateBegin;
  if (publishDateEnd != null) body.publishDateEnd = publishDateEnd;
  return body;
}
