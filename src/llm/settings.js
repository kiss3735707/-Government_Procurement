/** 模型连接配置。纯函数，不访问网络，不写库。 */

export const DEFAULT_LLM = {
  baseUrl: 'http://218.242.160.82:8002/v1',
  model: 'DeepSeek-V4-Flash-0731-w8a8',
  reasoning: 'off',
};

export function maskApiKey(apiKey) {
  const key = String(apiKey || '');
  if (!key) return '';
  if (key.length <= 4) return '****';
  return `****${key.slice(-4)}`;
}

export function chatCompletionsUrl(baseUrl) {
  const u = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!u) throw new Error('未填写网关地址');
  if (u.endsWith('/chat/completions')) return u;
  return `${u}/chat/completions`;
}

/** 空白或掩码表示保留已保存的密钥。 */
export function resolveApiKey(inputKey, existingKey) {
  const raw = String(inputKey ?? '').trim();
  if (!raw || raw.startsWith('****')) return existingKey || '';
  return raw;
}

export function normalizeLlmInput(input, existing = {}) {
  const baseUrl = String(input.baseUrl ?? existing.baseUrl ?? '').trim();
  if (!baseUrl) throw new Error('未填写网关地址');
  const model = String(input.model || existing.model || DEFAULT_LLM.model).trim();
  if (!model) throw new Error('未填写模型名');
  const reasoning = input.reasoning === 'on' ? 'on' : 'off';
  return {
    baseUrl,
    apiKey: resolveApiKey(input.apiKey, existing.apiKey),
    model,
    reasoning,
  };
}

export function redactSecret(text, secret) {
  const body = String(text ?? '');
  if (!secret) return body;
  return body.split(secret).join('***');
}
