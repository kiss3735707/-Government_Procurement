import { parseDetailId, parseListQuery, parseStatsQuery } from './params.js';
import { agentDetail, agentList, agentStats, tokenMatches } from './repo.js';

function bearer(header) {
  const match = /^Bearer\s+(\S+)$/.exec(String(header || ''));
  return match ? match[1] : '';
}

function parsed(fn) {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

export async function handleAgent(req, res, { pool, token, sendJson }) {
  const url = new URL(req.url || '/', 'http://local');
  const path = url.pathname;
  const method = (req.method || 'GET').toUpperCase();
  if (!tokenMatches(bearer(req.headers.authorization), token)) {
    return sendJson(res, 401, { error: 'unauthorized' });
  }
  if (method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' });

  if (path === '/api/agent/stats') {
    const filters = parsed(() => parseStatsQuery(url.searchParams));
    if (!filters.ok) return sendJson(res, 400, { error: '参数错误', message: filters.message });
    return sendJson(res, 200, await agentStats(pool, filters.value));
  }
  if (path === '/api/agent/announcements') {
    const filters = parsed(() => parseListQuery(url.searchParams));
    if (!filters.ok) return sendJson(res, 400, { error: '参数错误', message: filters.message });
    return sendJson(res, 200, await agentList(pool, filters.value));
  }
  const id = parseDetailId(path);
  if (id) {
    const row = await agentDetail(pool, id);
    if (!row) return sendJson(res, 404, { error: 'not_found' });
    return sendJson(res, 200, row);
  }
  return sendJson(res, 404, { error: 'not_found' });
}
