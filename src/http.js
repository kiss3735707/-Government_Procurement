/**
 * 轻量 HTTP 客户端：UA/Referer 头、限速、指数退避重试。
 * 只依赖 Node 内置 fetch（Node >= 20）。
 */
import { POLITENESS, SITE } from './config.js';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 全局限速：每个请求之间至少间隔 requestIntervalMs */
let lastRequestAt = 0;
async function throttle() {
  const wait = Math.max(0, POLITENESS.requestIntervalMs - (Date.now() - lastRequestAt));
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

async function request(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt <= POLITENESS.retries; attempt++) {
    if (attempt > 0) {
      const backoff = POLITENESS.retryBaseMs * 2 ** (attempt - 1);
      console.warn(`[http] retry ${attempt}/${POLITENESS.retries} after ${backoff}ms: ${url}`);
      await sleep(backoff);
    }
    await throttle();
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': UA,
          Referer: `${SITE.baseUrl}/`,
          Accept: 'application/json, text/plain, */*',
          ...(options.headers || {}),
        },
        signal: options.signal,
      });
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} for ${url}`);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error(`request failed: ${url}`);
}

/** GET JSON */
export async function getJson(url) {
  const res = await request(url, { method: 'GET' });
  const data = await res.json();
  if (data?.success === false) throw new Error(`api error: ${data?.error ?? 'unknown'}`);
  return data;
}

/** POST JSON body */
export async function postJson(url, body) {
  const res = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data?.success === false) throw new Error(`api error: ${data?.error ?? 'unknown'}`);
  return data;
}
