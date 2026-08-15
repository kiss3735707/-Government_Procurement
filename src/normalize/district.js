/**
 * 上海市区划归一化字典。
 *
 * 实测（2026-08-15，450 条样本）：源站区划名称有两种写法并存 ——
 *   - 多数："浦东新区"、"普陀区"
 *   - 中标结果里常见："上海市浦东新区"、"上海市宝山区"（带"上海市"前缀）
 * 销售清单只维护标准名，系统把所有写法归一到一个标准区名，避免漏配。
 *
 * 若未来遇到未知名称（新写法/非上海区划），normalizeDistrict 返回 null，
 * 由调用方进"待分配池"。
 */

const PREFIX = '上海市';

/** 标准区名 → 该区的全部已知写法（含带前缀变体，运行时自动生成） */
const STANDARD_REGIONS = [
  '黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区',
  '杨浦区', '闵行区', '宝山区', '嘉定区', '浦东新区', '金山区',
  '松江区', '青浦区', '奉贤区', '崇明区',
];

/** 区划编码（districtCode 实测样例；319900=本级，31xxxx=各区） */
export const DISTRICT_CODES = {
  黄浦区: '310101', 徐汇区: '310104', 长宁区: '310105', 静安区: '310106',
  普陀区: '310107', 虹口区: '310109', 杨浦区: '310110', 闵行区: '310112',
  宝山区: '310113', 嘉定区: '310114', 浦东新区: '310115', 金山区: '310116',
  松江区: '310117', 青浦区: '310118', 奉贤区: '310120', 崇明区: '310151',
  上海市本级: '319900',
};

/** 名称 → 标准区 的查找表（含带前缀变体） */
const LOOKUP = new Map();
for (const [standard, code] of Object.entries(DISTRICT_CODES)) {
  LOOKUP.set(standard, standard);
  LOOKUP.set(`${PREFIX}${standard}`, standard);
  LOOKUP.set(standard.replace('区', ''), standard); // "浦东" → 浦东新区
  LOOKUP.set(`${PREFIX}${standard.replace('区', '')}`, standard);
}
// 特殊别名
LOOKUP.set('上海市', '上海市本级');
LOOKUP.set('上海市本级', '上海市本级');
LOOKUP.set('市本级', '上海市本级');

/**
 * 把源站区划名称归一到标准区名。
 * @param {string|null|undefined} raw 源站 districtName
 * @returns {string|null} 标准区名（"浦东新区" / "上海市本级"）；未知返回 null
 */
export function normalizeDistrict(raw) {
  if (!raw) return null;
  const key = String(raw).trim();
  return LOOKUP.get(key) ?? null;
}

/** 所有标准区名（含本级） */
export const STANDARD_NAMES = Object.keys(DISTRICT_CODES);
