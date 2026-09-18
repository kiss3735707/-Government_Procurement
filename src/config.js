/**
 * 站点与栏目配置 — 上海市政府采购网（政采云）
 * 全部基于 2026-08-15 实机验证。
 */

export const SITE = {
  code: 'sh-zfcg',
  name: '上海市政府采购网',
  baseUrl: 'https://www.zfcg.sh.gov.cn',
  /** 详情接口需要的 parentId（采购公告栏目根） */
  parentId: '137027',
};

/** 采集目标栏目（已验证的编码） */
export const CATEGORIES = [
  {
    code: 'ZcyAnnouncement10016',
    type: 'intention',
    name: '采购意向公开',
  },
  {
    code: 'ZcyAnnouncement2',
    type: 'bidding',
    name: '采购公告（招标/磋商等）',
  },
  {
    code: 'ZcyAnnouncement4',
    type: 'award',
    name: '中标（成交）结果公告',
  },
];

/** 采集礼貌策略：请求间隔与重试 */
export const POLITENESS = {
  requestIntervalMs: 600,
  retries: 3,
  retryBaseMs: 1000,
  pageSize: 50,
};
