import http from 'node:http';
import { getPool } from '../db/pool.js';
import {
  adminAuthConfig,
  clearSessionCookie,
  parseCookie,
  sessionCookie,
  signSession,
  verifySession,
} from './auth.js';
import {
  createSales,
  deleteSales,
  exportSalesCsv,
  importSalesCsv,
  listSales,
  updateSales,
} from './salesRepo.js';
import { addTag, removeTag } from './tagRepo.js';
import { getAnnouncement, searchAnnouncementsAdmin } from './announceRepo.js';
import { announcementsPage, loginPage, salesPage } from './ui.js';
import { SALES_CSV_TEMPLATE } from '../digest/csv.js';
import { SALES_REGION_OPTIONS } from './validate.js';

const MAX_BODY = 2 * 1024 * 1024;

async function readBody(req) {
  const chunks = [];
  let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > MAX_BODY) throw new Error('请求体过大');
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, obj, extraHeaders = {}) {
  send(res, status, { 'content-type': 'application/json; charset=utf-8', ...extraHeaders }, JSON.stringify(obj));
}

function sendHtml(res, status, html, extraHeaders = {}) {
  send(res, status, { 'content-type': 'text/html; charset=utf-8', ...extraHeaders }, html);
}

function parseForm(text) {
  const out = {};
  for (const [k, v] of new URLSearchParams(text)) out[k] = v;
  return out;
}

function currentUser(req, auth) {
  const token = parseCookie(req.headers.cookie || '');
  return verifySession(token, auth.secret);
}

export async function handleAdmin(req, res, deps) {
  const { pool, auth } = deps;
  const url = new URL(req.url || '/', 'http://local');
  const path = url.pathname;
  const method = (req.method || 'GET').toUpperCase();
  const user = currentUser(req, auth);

  if (path === '/login' && method === 'GET') {
    return sendHtml(res, 200, loginPage(''));
  }
  if (path === '/login' && method === 'POST') {
    const body = parseForm(await readBody(req));
    if (!auth.pass || body.username !== auth.user || body.password !== auth.pass) {
      return sendHtml(res, 401, loginPage('账号或密码错误'));
    }
    const token = signSession(auth.user, auth.secret);
    return sendHtml(res, 302, '', { Location: '/sales', 'Set-Cookie': sessionCookie(token) });
  }
  if (path === '/api/login' && method === 'POST') {
    const body = JSON.parse((await readBody(req)) || '{}');
    if (!auth.pass || body.username !== auth.user || body.password !== auth.pass) {
      return sendJson(res, 401, { error: '账号或密码错误' });
    }
    const token = signSession(auth.user, auth.secret);
    return sendJson(res, 200, { ok: true, user: auth.user }, { 'Set-Cookie': sessionCookie(token) });
  }
  if ((path === '/logout' || path === '/api/logout') && method === 'POST') {
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
  }

  if (path.startsWith('/api/')) {
    if (!user) return sendJson(res, 401, { error: '未登录' });
    return handleApi(req, res, { pool, user, url, path, method });
  }

  if (!user) {
    return send(res, 302, { Location: '/login', 'content-type': 'text/plain; charset=utf-8' }, 'redirect');
  }
  if (path === '/' || path === '/sales') return sendHtml(res, 200, salesPage(user));
  if (path === '/announcements') return sendHtml(res, 200, announcementsPage(user));
  return sendHtml(res, 404, '<!doctype html><p>页面不存在 <a href="/sales">返回</a></p>');
}

async function handleApi(req, res, { pool, user, url, path, method }) {
  if (path === '/api/meta/districts' && method === 'GET') {
    return sendJson(res, 200, { rows: SALES_REGION_OPTIONS });
  }
  if (path === '/api/sales' && method === 'GET') {
    const rows = await listSales(pool, { activeOnly: url.searchParams.get('active') === '1' });
    return sendJson(res, 200, { rows });
  }
  if (path === '/api/sales' && method === 'POST') {
    const body = JSON.parse((await readBody(req)) || '{}');
    const out = await createSales(pool, body);
    if (out.error) return sendJson(res, out.status || 400, { error: out.error });
    return sendJson(res, 201, { row: out.row });
  }
  if (path === '/api/sales/import' && method === 'POST') {
    const body = JSON.parse((await readBody(req)) || '{}');
    const out = await importSalesCsv(pool, body.csv || '');
    return sendJson(res, 200, out);
  }
  if (path === '/api/sales/export' && method === 'GET') {
    const csv = await exportSalesCsv(pool);
    return send(res, 200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="sales_regions.csv"',
    }, csv);
  }
  if (path === '/api/sales/template' && method === 'GET') {
    return send(res, 200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="sales_regions.example.csv"',
    }, SALES_CSV_TEMPLATE);
  }
  const salesId = path.match(/^\/api\/sales\/(\d+)$/);
  if (salesId && method === 'PATCH') {
    const body = JSON.parse((await readBody(req)) || '{}');
    const out = await updateSales(pool, Number(salesId[1]), body);
    if (out.error) return sendJson(res, out.status || 400, { error: out.error });
    return sendJson(res, 200, { row: out.row });
  }
  if (salesId && method === 'DELETE') {
    const out = await deleteSales(pool, Number(salesId[1]));
    if (out.error) return sendJson(res, out.status || 400, { error: out.error });
    return sendJson(res, 200, { ok: true });
  }
  if (path === '/api/announcements' && method === 'GET') {
    const filters = {
      type: url.searchParams.get('type') || undefined,
      district: url.searchParams.get('district') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
      keyword: url.searchParams.get('keyword') || undefined,
      purchaser: url.searchParams.get('purchaser') || undefined,
      projectCode: url.searchParams.get('projectCode') || undefined,
      limit: url.searchParams.get('limit') || 50,
      offset: url.searchParams.get('offset') || 0,
    };
    const rows = await searchAnnouncementsAdmin(pool, filters);
    return sendJson(res, 200, { rows });
  }
  const ann = path.match(/^\/api\/announcements\/(\d+)$/);
  if (ann && method === 'GET') {
    const row = await getAnnouncement(pool, Number(ann[1]));
    if (!row) return sendJson(res, 404, { error: '公告不存在' });
    return sendJson(res, 200, row);
  }
  const add = path.match(/^\/api\/announcements\/(\d+)\/tags$/);
  if (add && method === 'POST') {
    const body = JSON.parse((await readBody(req)) || '{}');
    const out = await addTag(pool, Number(add[1]), body, user);
    if (out.error) return sendJson(res, out.status || 400, { error: out.error });
    return sendJson(res, 201, { row: out.row });
  }
  const rm = path.match(/^\/api\/announcements\/(\d+)\/tags\/(\d+)$/);
  if (rm && method === 'DELETE') {
    const out = await removeTag(pool, Number(rm[1]), Number(rm[2]));
    if (out.error) return sendJson(res, out.status || 400, { error: out.error });
    return sendJson(res, 200, { ok: true });
  }
  return sendJson(res, 404, { error: '接口不存在' });
}

export function createAdminServer(opts = {}) {
  const pool = opts.pool || getPool();
  const auth = opts.auth || adminAuthConfig();
  return http.createServer((req, res) => {
    handleAdmin(req, res, { pool, auth }).catch((err) => {
      if (!res.headersSent) sendJson(res, 500, { error: err.message || String(err) });
    });
  });
}
