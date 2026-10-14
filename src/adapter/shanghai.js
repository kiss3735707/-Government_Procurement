/**
 * 上海政采云数据源适配器。
 * 列表接口：POST /portal/category（分页、时间过滤）
 * 详情接口：GET /portal/detail?articleId=&parentId=
 * siteId：GET /portal/getSiteId（详情联调参数，缓存）
 */
import { getJson, postJson } from '../http.js';
import { SITE, POLITENESS } from '../config.js';
import { buildCategoryBody } from './categoryBody.js';

let siteIdCache = null;

async function getSiteId() {
  if (siteIdCache !== null) return siteIdCache;
  const d = await getJson(`${SITE.baseUrl}/portal/getSiteId`);
  siteIdCache = d?.result?.data ?? 77;
  return siteIdCache;
}

/**
 * 抓取一个栏目的一页公告列表。
 * @param {string} categoryCode 栏目编码
 * @param {object} opts { pageNo, pageSize, beginDate, endDate, publishDateBegin, publishDateEnd }
 */
export async function fetchCategoryPage(categoryCode, { pageNo = 1, pageSize = POLITENESS.pageSize, beginDate, endDate, publishDateBegin, publishDateEnd } = {}) {
  const body = buildCategoryBody({
    parentId: SITE.parentId,
    categoryCode,
    pageNo,
    pageSize,
    beginDate,
    endDate,
    publishDateBegin,
    publishDateEnd,
  });
  const d = await postJson(`${SITE.baseUrl}/portal/category`, body);
  const data = d?.result?.data;
  if (!data) return { total: 0, items: [] };
  return { total: data.total ?? 0, items: data.data ?? [] };
}

/**
 * 抓取单条公告详情。
 * @param {string} articleId
 * @returns {Promise<object|null>} 详情对象；接口无数据时返回 null
 */
export async function fetchDetail(articleId) {
  const siteId = await getSiteId();
  const url = `${SITE.baseUrl}/portal/detail?articleId=${encodeURIComponent(articleId)}&parentId=${SITE.parentId}&siteId=${siteId}`;
  const d = await getJson(url);
  return d?.result?.data ?? null;
}
