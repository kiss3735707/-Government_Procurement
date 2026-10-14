/**
 * 调用 OpenAI 兼容网关。只用于测试连接，不打业务标签。
 * 错误信息里不保留 api_key。
 */
import { chatCompletionsUrl, redactSecret } from './settings.js';

export async function testLlmConnection(settings, { fetchImpl = fetch, timeoutMs = 20000 } = {}) {
  const { baseUrl, apiKey, model, reasoning } = settings;
  if (!apiKey) return { ok: false, message: '未填写 api_key' };
  let url;
  try {
    url = chatCompletionsUrl(baseUrl);
  } catch (err) {
    return { ok: false, message: err.message };
  }
  const body = {
    model,
    messages: [{ role: 'user', content: '只回复OK' }],
    max_tokens: 8,
  };
  if (reasoning === 'on') body.reasoning_effort = 'low';
  else body.reasoning_effort = 'none';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, message: `网关返回 ${res.status}：${clip(redactSecret(text, apiKey))}` };
    }
    return { ok: true, message: '连接成功' };
  } catch (err) {
    const message = err?.name === 'AbortError' ? '连接超时' : (err?.message || '连接失败');
    return { ok: false, message: redactSecret(message, apiKey) };
  } finally {
    clearTimeout(timer);
  }
}

function clip(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > 180 ? `${t.slice(0, 180)}…` : t;
}
