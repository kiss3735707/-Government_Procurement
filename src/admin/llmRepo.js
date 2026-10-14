import { DEFAULT_LLM, maskApiKey, normalizeLlmInput } from '../llm/settings.js';

function fromRow(row) {
  if (!row) {
    return { baseUrl: DEFAULT_LLM.baseUrl, apiKey: '', model: DEFAULT_LLM.model, reasoning: 'off' };
  }
  return {
    baseUrl: row.base_url || DEFAULT_LLM.baseUrl,
    apiKey: row.api_key || '',
    model: row.model || DEFAULT_LLM.model,
    reasoning: row.reasoning === 'on' ? 'on' : 'off',
  };
}

export function publicLlmSettings(row) {
  return {
    baseUrl: row.baseUrl,
    model: row.model,
    reasoning: row.reasoning,
    hasKey: Boolean(row.apiKey),
    apiKeyMask: maskApiKey(row.apiKey),
  };
}

export async function getLlmSettings(pool) {
  const res = await pool.query(
    `SELECT base_url, api_key, model, reasoning FROM llm_settings WHERE id = 1`
  );
  return fromRow(res.rows[0]);
}

export async function saveLlmSettings(pool, input) {
  const existing = await getLlmSettings(pool);
  const next = normalizeLlmInput(input, existing);
  await pool.query(
    `INSERT INTO llm_settings (id, base_url, api_key, model, reasoning, updated_at)
     VALUES (1, $1, $2, $3, $4, now())
     ON CONFLICT (id) DO UPDATE SET
       base_url = EXCLUDED.base_url,
       api_key = EXCLUDED.api_key,
       model = EXCLUDED.model,
       reasoning = EXCLUDED.reasoning,
       updated_at = now()`,
    [next.baseUrl, next.apiKey, next.model, next.reasoning]
  );
  return next;
}
