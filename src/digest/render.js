/** 日报正文（纯文本，设计方案 §8.2）。 */

export function formatWan(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '金额未知';
  const wan = Number(amount) / 10000;
  const n = wan.toFixed(2).replace(/\.?0+$/, '');
  return `${n} 万元`;
}

function listIntention(items) {
  const rows = items.filter((a) => a.type === 'intention');
  if (!rows.length) return '  （无）';
  return rows
    .map((a, i) => {
      const details = Array.isArray(a.items) && a.items.length ? a.items : [{ item_name: a.title, budget_amount: a.budget_amount, expect_month: a.tags?.intent_month }];
      return details
        .map((d, j) => {
          const name = d.item_name || a.title;
          const idx = details.length > 1 ? `${i + 1}.${j + 1}` : `${i + 1}`;
          return `  ${idx}. [${a.title}] ${name}\n     预算 ${formatWan(d.budget_amount)} | 预计采购 ${d.expect_month || '未知'} | 采购人：${a.purchaser || '未知'}`;
        })
        .join('\n');
    })
    .join('\n');
}

function listBidding(items) {
  const rows = items.filter((a) => a.type === 'bidding');
  if (!rows.length) return '  （无）';
  return rows
    .map((a, i) => {
      const open = a.bid_open_time ? String(a.bid_open_time).replace('T', ' ').slice(0, 16) : '未知';
      return `  ${i + 1}. [${a.title}]\n     预算 ${formatWan(a.budget_amount)} | 开标 ${open} | 项目编号 ${a.project_code || '未知'}`;
    })
    .join('\n');
}

function listAward(items) {
  const rows = items.filter((a) => a.type === 'award');
  if (!rows.length) return '  （无）';
  return rows
    .map((a, i) => `  ${i + 1}. [${a.title}]\n     成交金额 ${formatWan(a.award_amount)} | 供应商：${a.supplier || '见附件'}`)
    .join('\n');
}

export function renderDigest({ date, name, regions, items, unassigned = false, citywide = false }) {
  const who = citywide
    ? '管理员（全市）'
    : unassigned
      ? '待分配池（管理员）'
      : `${name}（${(regions || []).join('、')}）`;
  const nI = items.filter((a) => a.type === 'intention').length;
  const nB = items.filter((a) => a.type === 'bidding').length;
  const nA = items.filter((a) => a.type === 'award').length;
  const subject = `【上海政府采购日报】${date}  ${who}`;
  const text = `${subject}

一、新增采购意向（${nI} 条）—— 建议提前联系
${listIntention(items)}

二、开始招标（${nB} 条）—— 评估投标
${listBidding(items)}

三、中标（成交）结果（${nA} 条）—— 竞争情报
${listAward(items)}

【数据说明】来源：上海市政府采购网 | 采集：每日17:00 | 内部资料，请勿外传
`;
  return { subject, text };
}
