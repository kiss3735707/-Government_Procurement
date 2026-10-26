#!/usr/bin/env node
/**
 * 给已经打过标、但行业不在字典里的中标补行业和内容标签。
 * 不改供应商、成交金额，也不重打整份 JSON。
 * 上海时间 19:40–21:00 暂停，把模型网关留给 20:00 的当天打标。
 */
import { closePool, getPool } from './db/pool.js';
import { databaseUrl } from './db/env.js';
import { getLlmSettings } from './admin/llmRepo.js';
import { TAG_CONCURRENCY, completeChat, mapPool } from './llm/tagRun.js';
import {
  CLASSIFY_MAX_TOKENS,
  applyIndustryResult,
  buildIndustryClassifyPrompt,
  inGatewayQuiet,
  listIndustryTargets,
  markIndustryFailed,
  parseIndustryResult,
} from './llm/classifyIndustry.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitOutQuiet() {
  if (!inGatewayQuiet(new Date())) return;
  console.log('暂停调用模型，19:40–21:00 留给每天 20:00 的打标');
  while (inGatewayQuiet(new Date())) await sleep(60_000);
}

if (!databaseUrl()) {
  console.error('需要 DATABASE_URL');
  process.exitCode = 1;
} else {
  const pool = getPool();
  try {
    const settings = await getLlmSettings(pool);
    if (!settings.apiKey) throw new Error('未配置 api_key');
    let done = 0;
    let failed = 0;
    while (true) {
      await waitOutQuiet();
      const rows = await listIndustryTargets(pool, 30);
      if (!rows.length) {
        console.log(`行业补充分类结束 done=${done} failed=${failed}`);
        break;
      }
      console.log(`本批 ${rows.length} 条`);
      await mapPool(rows, TAG_CONCURRENCY, async (row) => {
        try {
          const text = await completeChat(settings, buildIndustryClassifyPrompt(row), {
            maxTokens: CLASSIFY_MAX_TOKENS,
            timeoutMs: 60_000,
          });
          const result = parseIndustryResult(text);
          await applyIndustryResult(pool, row.id, result);
          done += 1;
          console.log(`classified ${row.id} ${result.main_industry} tags=${result.purchase_content_tags.length} ${row.title}`);
        } catch (err) {
          const transient = /网关返回 503|模型响应超时/.test(err.message || '');
          if (transient) await sleep(20_000);
          else {
            await markIndustryFailed(pool, row.id, err.message);
            failed += 1;
          }
          console.error(`classify failed ${row.id}: ${err.message}`);
        }
      });
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await closePool().catch(() => {});
  }
}
