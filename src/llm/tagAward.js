/**
 * 中标 AI 打标的纯逻辑：提示词、JSON 解析、包件行。不访问网络，不写库。
 */
import { MAIN_INDUSTRIES } from './industries.js';

const MAX_BODY = 12000;

export function buildAwardTagPrompt(row) {
  const body = String(row.content_text || '').slice(0, MAX_BODY);
  return `你是政府采购数据治理专家。只根据原文提取中标（成交）结果，不虚构。无法确认的枚举填“未明确”。多个包件逐条输出，不得合并。政策类标签原文没有就填“未明确”。
industry.main_industry 只能从这些一级行业里选一个：${MAIN_INDUSTRIES.join('、')}。归不进去写「其他」。主行业不要写「未明确」，也不要写国民经济行业分类。
purchase_content_tags 写 1 到 5 个采购物的短名称，不要写句子。
只输出一个 JSON 对象，不要 Markdown。结构如下：
{"announcement":{"title":"","project_name":"","project_code":"","info_type":"中标（成交）结果公告","result_status":"","is_multi_package":"","package_count":0},"region":{"province":"上海","city":"上海市","district":""},"purchaser":{"name":"","unit_nature":""},"project_type":{"purchase_object":"货物类|工程类|服务类|未明确"},"amount":{"header_amount":0,"item_total_amount":0,"currency":"人民币","amount_consistency":"一致|不一致|无法判断","amount_range":""},"result":{"supplier_count":0,"supplier_names":[]},"result_items":[{"item_index":1,"item_name":"","supplier_name":"","supplier_address":"","deal_amount":0,"review_score":0,"service_time_or_construction_period":""}],"industry":{"main_industry":"其他","sub_industry":[]},"purchase_content_tags":[],"quality":{"confidence":0,"missing_fields":[],"warnings":[]}}

标题：${row.title || ''}
采购人：${row.purchaser || ''}
区划：${row.district_name || ''}
项目名称：${row.project_name || ''}
项目编号：${row.project_code || ''}
规则抽取成交金额：${row.award_amount ?? ''}
规则抽取供应商：${row.supplier || ''}

正文：
${body}`;
}

export function parseModelJson(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('模型没有返回 JSON');
  const payload = JSON.parse(candidate.slice(start, end + 1));
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('模型 JSON 不是对象');
  }
  if (!Array.isArray(payload.result_items)) throw new Error('缺少 result_items');
  return payload;
}

function money(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function packagesFromPayload(payload) {
  return payload.result_items.map((it, i) => ({
    item_index: Number(it.item_index) || i + 1,
    item_name: it.item_name || null,
    supplier_name: it.supplier_name || null,
    deal_amount: money(it.deal_amount),
    industry: payload.industry?.main_industry || null,
    content_tags: Array.isArray(payload.purchase_content_tags) ? payload.purchase_content_tags : [],
  }));
}

export function messageText(data) {
  const msg = data?.choices?.[0]?.message || {};
  const content = msg.content;
  if (typeof content === 'string' && content.trim()) return content;
  if (Array.isArray(content)) {
    const joined = content.map((p) => p?.text || '').join('');
    if (joined.trim()) return joined;
  }
  if (typeof msg.reasoning === 'string' && msg.reasoning.trim()) return msg.reasoning;
  return '';
}
