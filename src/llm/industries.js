/**
 * 字典里的一级行业。归不进去用「其他」，不用「未明确」。
 */

export const MAIN_INDUSTRIES = [
  '应急管理',
  '公共安全',
  '建筑工程',
  '城市管理',
  '基层治理',
  '市政交通',
  '绿化园林',
  '水务水利',
  '信息化数字化',
  '教育',
  '医疗卫生',
  '民政养老',
  '文化体育',
  '市场监管',
  '财税审计',
  '法律咨询',
  '科研技术',
  '商业服务',
  '其他',
];

export const SUB_INDUSTRIES = [
  '安全生产服务',
  '安全第三方服务',
  '消防安全',
  '应急预案',
  '防灾减灾',
  '平安建设',
  '治安辅助',
  '公安信息化',
  '指挥中心建设',
  '技防建设',
  '物防设施',
  '房屋修缮',
  '消防工程',
  '建筑改造',
  '装修改造',
  '安装工程',
  '环卫保洁',
  '市容管理',
  '市政养护',
  '违法建筑整治',
  '社区治理',
  '村居服务',
  '网格化管理',
  '社工服务',
  '软件开发',
  '平台运维',
  '机房建设',
  '综合布线',
  '监控改造',
  '大屏系统',
  '会议系统',
  '道路养护',
  '交通设施',
  '停车管理',
  '照明设施',
  '绿化养护',
  '公园管理',
  '景观提升',
  '河道养护',
  '排水维护',
  '污水处理',
  '防汛防台',
];

export function assertMainIndustry(value) {
  const text = String(value || '').trim();
  if (!MAIN_INDUSTRIES.includes(text)) throw new Error('主行业不在字典中');
  return text;
}

export function cleanLabelList(value, { allowed, max = 5, maxLength = 20 } = {}) {
  const list = Array.isArray(value) ? value : [];
  const out = [];
  for (const item of list) {
    const text = String(item || '').trim();
    if (!text || text === '未明确' || text.length > maxLength) continue;
    if (allowed && !allowed.includes(text)) continue;
    if (out.includes(text)) continue;
    out.push(text);
    if (out.length === max) break;
  }
  return out;
}
