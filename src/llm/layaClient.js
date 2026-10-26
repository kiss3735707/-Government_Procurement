/**
 * 用本地 Laya 做一级行业选择。不生成正文，不改供应商和成交金额。
 */
import { MAIN_INDUSTRIES, assertMainIndustry } from './industries.js';

export const LAYA_MIN_CONFIDENCE = 0.35;

/** 每个选项一句话，给 Laya 的 choice 标准。 */
export const INDUSTRY_CRITERIA = {
  应急管理: '安全生产、消防、防灾减灾、应急指挥和物资',
  公共安全: '治安、监控、安检、警务和保密',
  建筑工程: '房屋、装修、施工、监理和工程造价',
  城市管理: '市容、环卫、垃圾清运、停车场和城市运行',
  基层治理: '居村委会、社区服务和基层治理',
  市政交通: '道路、桥梁、公交、停车设施和交通工程',
  绿化园林: '绿化养护、园林、苗木和公园',
  水务水利: '供水、排水、污水、水利和河道',
  信息化数字化: '软件、系统、网络、云和信息化项目',
  教育: '学校、培训、教材、校园服务',
  医疗卫生: '医院、药品、医疗设备和卫生服务',
  民政养老: '养老、救助、殡葬、福利和社工',
  文化体育: '文化、体育、场馆、展览和演艺',
  市场监管: '检验检测、计量、食品药品监管和标准',
  财税审计: '审计、会计、资产评估和税务',
  法律咨询: '法律服务、律师和公证',
  科研技术: '科研课题、技术开发和实验',
  商业服务: '物业、餐饮、会务、印刷、租赁和一般服务',
  其他: '无法归入以上各类',
};

export function buildLayaState(row) {
  const items = Array.isArray(row.items) ? row.items.slice(0, 8) : [];
  const lines = items.map((item, index) => `${index + 1}. ${item.item_name || ''}`);
  return `标题：${row.title || ''}\n采购人：${row.purchaser || ''}\n包件：\n${lines.join('\n')}`;
}

export function industryQuestion() {
  return {
    type: 'choice',
    instructions: '这条上海政府采购中标公告最符合哪一个一级行业？只看采购了什么，不要看采购人名称。',
    criteria: INDUSTRY_CRITERIA,
  };
}

function confidenceOf(answer) {
  if (typeof answer?.confidence === 'number') return answer.confidence;
  const probs = answer?.probabilities;
  if (probs && typeof probs === 'object') {
    const values = Object.values(probs).filter((value) => typeof value === 'number');
    if (values.length) return Math.max(...values);
  }
  return 1;
}

/**
 * 低置信度不硬贴行业，记成「其他」。
 * 返回的对象可以直接交给 applyIndustryResult。
 */
export function industryFromLaya(body, { minConfidence = LAYA_MIN_CONFIDENCE } = {}) {
  const answer = body?.answers?.industry;
  if (!answer || answer.choice == null || answer.choice === '') {
    throw new Error('Laya 没有返回行业');
  }
  const raw = String(answer.choice);
  if (!MAIN_INDUSTRIES.includes(raw)) throw new Error('Laya 返回了字典外的行业');
  const confidence = confidenceOf(answer);
  const main = confidence < minConfidence ? '其他' : assertMainIndustry(raw);
  return {
    main_industry: main,
    sub_industry: [],
    purchase_content_tags: [],
    confidence,
    raw_choice: raw,
  };
}
