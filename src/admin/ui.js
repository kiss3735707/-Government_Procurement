import { STANDARD_NAMES } from '../normalize/district.js';

function escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

const DISTRICT_OPTIONS = STANDARD_NAMES.map(
  (n) => `<option value="${escAttr(n)}">${escAttr(n)}</option>`
).join('');

const CSS = `
:root { --bg:#f4f6f8; --card:#fff; --line:#d8dee6; --text:#1f2933; --muted:#52606d; --brand:#1d4ed8; --danger:#b91c1c; }
* { box-sizing: border-box; }
body { margin:0; font:14px/1.5 "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; background:var(--bg); color:var(--text); }
a { color:var(--brand); }
header { background:#111827; color:#fff; display:flex; align-items:center; gap:16px; padding:10px 20px; }
header a { color:#e5e7eb; text-decoration:none; padding:4px 8px; border-radius:4px; }
header a.active, header a:hover { background:#374151; color:#fff; }
header .sp { flex:1; }
.wrap { max-width: 1100px; margin: 20px auto; padding: 0 16px 40px; }
.card { background:var(--card); border:1px solid var(--line); border-radius:8px; padding:16px; margin-bottom:16px; }
h1 { font-size:18px; margin:0 0 12px; }
label { display:block; font-size:12px; color:var(--muted); margin:8px 0 4px; }
input, select, textarea { width:100%; padding:8px; border:1px solid var(--line); border-radius:4px; }
.row { display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:8px; align-items:end; }
button, .btn { background:var(--brand); color:#fff; border:0; border-radius:4px; padding:8px 12px; cursor:pointer; text-decoration:none; display:inline-block; }
button.secondary, .btn.secondary { background:#6b7280; }
button.danger { background:var(--danger); }
.toolbar { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
table { width:100%; border-collapse: collapse; font-size:13px; }
th, td { border-bottom:1px solid var(--line); text-align:left; padding:8px; vertical-align:top; }
.muted { color:var(--muted); }
.err { color:var(--danger); white-space:pre-wrap; }
.ok { color:#047857; }
.chip { display:inline-block; background:#e0e7ff; color:#3730a3; border-radius:999px; padding:2px 8px; margin:2px; font-size:12px; }
.login { max-width:360px; margin:12vh auto; background:var(--card); padding:24px; border-radius:8px; border:1px solid var(--line); }
.detail { display:grid; grid-template-columns: 1fr 320px; gap:16px; }
@media (max-width: 900px) { .detail { grid-template-columns: 1fr; } }
`;

function shell(title, nav, body, script) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escAttr(title)}</title>
<style>${CSS}</style>
</head>
<body>
${nav}
<div class="wrap">${body}</div>
<script>
${script || ''}
</script>
</body>
</html>`;
}

function nav(active, user) {
  const item = (href, id, label) =>
    `<a href="${href}" class="${active === id ? 'active' : ''}">${label}</a>`;
  return `<header>
  <strong>政府采购提醒</strong>
  ${item('/sales', 'sales', '销售管理')}
  ${item('/announcements', 'announcements', '公告数据')}
  <span class="sp"></span>
  <span class="muted">${escAttr(user || '')}</span>
  <a href="#" onclick="fetch('/api/logout',{method:'POST'}).then(()=>location.href='/login');return false">退出</a>
</header>`;
}

const COMMON_JS = `
async function api(path, opts={}) {
  const r = await fetch(path, {
    credentials: 'same-origin',
    headers: Object.assign({'content-type':'application/json'}, opts.headers || {}),
    ...opts,
  });
  if (r.status === 401) { location.href = '/login'; throw new Error('未登录'); }
  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('json') ? await r.json() : await r.text();
  if (!r.ok) throw new Error((data && data.error) || r.statusText || String(r.status));
  return data;
}
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
}
function showMsg(id, text, ok) {
  const el = document.getElementById(id);
  el.className = ok ? 'ok' : 'err';
  el.textContent = text || '';
}
`;

export function loginPage(error) {
  return shell(
    '登录',
    '',
    `<div class="login">
      <h1>政府采购提醒系统</h1>
      <form method="post" action="/login">
        <label>用户名</label><input name="username" autocomplete="username" required>
        <label>密码</label><input name="password" type="password" autocomplete="current-password" required>
        <p class="err">${escAttr(error || '')}</p>
        <p><button type="submit">登录</button></p>
      </form>
    </div>`,
    ''
  );
}

export function salesPage(user) {
  return shell(
    '销售管理',
    nav('sales', user),
    `<div class="card">
      <h1>销售管理</h1>
      <div class="toolbar">
        <label style="margin:0"><input type="checkbox" id="onlyActive"> 仅看启用</label>
        <a class="btn secondary" href="/api/sales/template">下载模板</a>
        <a class="btn secondary" href="/api/sales/export">导出CSV</a>
        <label class="btn secondary" style="margin:0">导入CSV<input type="file" id="csvFile" accept=".csv,text/csv" hidden></label>
      </div>
      <p id="msg"></p>
      <form id="salesForm">
        <input type="hidden" name="row_id" id="salesId">
        <div class="row">
          <div><label>姓名*</label><input name="sales_name" required></div>
          <div><label>邮箱*</label><input name="sales_email" type="email" required></div>
          <div><label>负责区域*</label><select name="region">${DISTRICT_OPTIONS}</select></div>
          <div><label>备注</label><input name="note"></div>
          <div><label>启用</label><select name="is_active"><option value="true">是</option><option value="false">否</option></select></div>
        </div>
        <p style="margin-top:12px"><button type="submit">保存</button> <button type="button" class="secondary" id="resetBtn">清空</button></p>
      </form>
    </div>
    <div class="card">
      <table><thead><tr><th>ID</th><th>姓名</th><th>邮箱</th><th>区域</th><th>备注</th><th>启用</th><th>操作</th></tr></thead>
      <tbody id="rows"></tbody></table>
    </div>`,
    COMMON_JS + `
const form = document.getElementById('salesForm');
let cache = [];
async function load() {
  const q = document.getElementById('onlyActive').checked ? '?active=1' : '';
  const data = await api('/api/sales' + q);
  cache = data.rows || [];
  document.getElementById('rows').innerHTML = cache.map(r => \`
    <tr>
      <td>\${r.id}</td><td>\${esc(r.sales_name)}</td><td>\${esc(r.sales_email)}</td>
      <td>\${esc(r.region)}</td><td>\${esc(r.note)}</td><td>\${r.is_active ? '是' : '否'}</td>
      <td>
        <button type="button" class="secondary" data-edit="\${r.id}">编辑</button>
        <button type="button" class="danger" data-del="\${r.id}">删除</button>
      </td>
    </tr>\`).join('') || '<tr><td colspan="7" class="muted">暂无数据，点击上方保存新增</td></tr>';
}
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const body = Object.fromEntries(fd.entries());
  body.is_active = body.is_active === 'true';
  const id = body.row_id;
  delete body.row_id;
  try {
    if (id) await api('/api/sales/' + id, { method:'PATCH', body: JSON.stringify(body) });
    else await api('/api/sales', { method:'POST', body: JSON.stringify(body) });
    showMsg('msg', '已保存', true);
    form.reset(); document.getElementById('salesId').value = '';
    await load();
  } catch (err) { showMsg('msg', err.message, false); }
});
document.getElementById('resetBtn').onclick = () => { form.reset(); document.getElementById('salesId').value=''; };
document.getElementById('onlyActive').onchange = () => load().catch(e => showMsg('msg', e.message, false));
document.getElementById('rows').addEventListener('click', async (e) => {
  const del = e.target.getAttribute('data-del');
  const edit = e.target.getAttribute('data-edit');
  if (edit) {
    const r = cache.find(x => String(x.id) === String(edit)); if (!r) return;
    document.getElementById('salesId').value = r.id;
    form.sales_name.value = r.sales_name;
    form.sales_email.value = r.sales_email;
    form.region.value = r.region;
    form.note.value = r.note || '';
    form.is_active.value = r.is_active ? 'true' : 'false';
  }
  if (del && confirm('删除后该销售将不再收到该区域日报，确定？')) {
    try { await api('/api/sales/' + del, { method:'DELETE' }); showMsg('msg','已删除',true); await load(); }
    catch (err) { showMsg('msg', err.message, false); }
  }
});
document.getElementById('csvFile').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const csv = await file.text();
  try {
    const r = await api('/api/sales/import', { method:'POST', body: JSON.stringify({ csv }) });
    const fail = (r.failed || []).map(x => '第' + x.line + '行：' + x.reason).join('\\n');
    showMsg('msg', '导入成功 ' + r.success + ' 条' + (fail ? '\\n失败：\\n' + fail : ''), !fail);
    await load();
  } catch (err) { showMsg('msg', err.message, false); }
  e.target.value = '';
});
load().catch(e => showMsg('msg', e.message, false));
`
  );
}

export function announcementsPage(user) {
  return shell(
    '公告数据',
    nav('announcements', user),
    `<div class="card">
      <h1>公告查询</h1>
      <form id="q" class="row">
        <div><label>类型</label><select name="type"><option value="">全部</option><option value="intention">意向公开</option><option value="bidding">招标</option><option value="award">中标</option></select></div>
        <div><label>区划</label><select name="district"><option value="">全部</option>${DISTRICT_OPTIONS}</select></div>
        <div><label>起始日</label><input name="from" type="date"></div>
        <div><label>结束日</label><input name="to" type="date"></div>
        <div><label>关键词</label><input name="keyword" placeholder="标题/采购人"></div>
        <div><button type="submit">查询</button></div>
      </form>
      <p id="msg"></p>
    </div>
    <div class="detail">
      <div class="card"><table><thead><tr><th>时间</th><th>类型</th><th>区划</th><th>标题</th></tr></thead><tbody id="rows"></tbody></table></div>
      <div class="card" id="detail"><p class="muted">点左侧一行查看详情并打标签</p></div>
    </div>`,
    COMMON_JS + `
const q = document.getElementById('q');
async function load() {
  const fd = new FormData(q);
  const p = new URLSearchParams([...fd.entries()].filter(([,v]) => v));
  const data = await api('/api/announcements?' + p.toString());
  document.getElementById('rows').innerHTML = (data.rows || []).map(r => \`
    <tr data-id="\${r.id}" style="cursor:pointer">
      <td>\${esc(String(r.publish_time||'').slice(0,10))}</td>
      <td>\${esc(r.type)}</td><td>\${esc(r.district_name)}</td>
      <td>\${esc(r.title)}</td>
    </tr>\`).join('') || '<tr><td colspan="4" class="muted">暂无数据</td></tr>';
}
q.addEventListener('submit', (e) => { e.preventDefault(); load().catch(err => showMsg('msg', err.message, false)); });
document.getElementById('rows').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-id]'); if (!tr) return;
  openDetail(tr.getAttribute('data-id'));
});
async function openDetail(id) {
  try {
    const d = await api('/api/announcements/' + id);
    const tags = (d.manual_tags || []).map(t =>
      \`<span class="chip">\${esc(t.tag_key)}:\${esc(t.tag_value)} <a href="#" data-rm="\${t.id}">×</a></span>\`
    ).join(' ') || '<span class="muted">暂无人工标签</span>';
    const items = (d.items || []).map((it,i) =>
      \`<li>\${esc(it.item_name)} \${esc(it.budget_amount||'')} \${esc(it.expect_month||'')}</li>\`
    ).join('');
    document.getElementById('detail').innerHTML = \`
      <h1>公告详情</h1>
      <p><b>\${esc(d.title)}</b></p>
      <p class="muted">\${esc(d.type_detail||d.type)} · \${esc(d.district_name)} · \${esc(d.purchaser)}</p>
      <p>项目编号：\${esc(d.project_code)}　预算：\${esc(d.budget_amount)}　中标：\${esc(d.award_amount)} \${esc(d.supplier)}</p>
      <p><a href="\${esc(d.source_url)}" target="_blank" rel="noopener">打开原公告 ↗</a></p>
      <p>\${esc(d.content_text||'').slice(0,800)}</p>
      \${items ? '<p>意向明细</p><ol>'+items+'</ol>' : ''}
      <p>人工标签</p>
      <div id="tags">\${tags}</div>
      <form id="tagForm">
        <div class="row">
          <div><label>维度</label><select name="tag_key">
            <option value="product_line">产品线</option>
            <option value="customer_stage">客户阶段</option>
            <option value="priority">优先级</option>
            <option value="custom">自定义</option>
          </select></div>
          <div><label>值</label><input name="tag_value" placeholder="如 实验室设备 / 高"></div>
        </div>
        <p><button type="submit">添加标签</button></p>
      </form>\`;
    document.getElementById('tagForm').onsubmit = async (ev) => {
      ev.preventDefault();
      const body = Object.fromEntries(new FormData(ev.target).entries());
      try { await api('/api/announcements/' + id + '/tags', { method:'POST', body: JSON.stringify(body) }); openDetail(id); }
      catch (err) { showMsg('msg', err.message, false); }
    };
    document.getElementById('tags').onclick = async (ev) => {
      const rm = ev.target.getAttribute('data-rm'); if (!rm) return;
      ev.preventDefault();
      try { await api('/api/announcements/' + id + '/tags/' + rm, { method:'DELETE' }); openDetail(id); }
      catch (err) { showMsg('msg', err.message, false); }
    };
  } catch (err) { showMsg('msg', err.message, false); }
}
load().catch(e => showMsg('msg', e.message, false));
`
  );
}
