import { createHmac, timingSafeEqual } from 'node:crypto';
import { loadEnv } from '../db/env.js';

export const SESSION_COOKIE = 'zfcg_admin';
export const SESSION_TTL_SEC = 8 * 3600;

export function adminAuthConfig() {
  loadEnv();
  return {
    user: process.env.ADMIN_USER || 'admin',
    pass: process.env.ADMIN_PASS || '',
    secret: process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASS || 'zfcg-dev',
  };
}

export function signSession(username, secret, now = Date.now()) {
  const exp = now + SESSION_TTL_SEC * 1000;
  const payload = Buffer.from(JSON.stringify({ u: username, exp })).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySession(token, secret, now = Date.now()) {
  if (!token || !String(token).includes('.')) return null;
  const [payload, sig] = String(token).split('.');
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.u || !data.exp || data.exp < now) return null;
    return data.u;
  } catch {
    return null;
  }
}

export function parseCookie(header, name = SESSION_COOKIE) {
  if (!header) return '';
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k === name) return part.slice(i + 1).trim();
  }
  return '';
}

export function sessionCookie(token, maxAge = SESSION_TTL_SEC) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
