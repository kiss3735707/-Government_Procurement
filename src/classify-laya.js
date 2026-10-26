#!/usr/bin/env node
/**
 * 用本机 Laya 给已打标、行业不在字典里的中标补一级行业。
 * 不改供应商、成交金额，也不重打整份 JSON。
 */
import { closePool, getPool } from './db/pool.js';
import { databaseUrl } from './db/env.js';
import { applyIndustryResult, listIndustryTargets, markIndustryFailed } from './llm/classifyIndustry.js';
import { buildLayaState, industryFromLaya, industryQuestion } from './llm/layaClient.js';

const BATCH = 16;

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unwrapResult(item) {
  if (item?.answers) return item;
  if (item?.body?.answers) return item.body;
  return item;
}

async function classifyBatch(url, rows) {
  const response = await fetch(`${url}/v1/systemone/batch`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'multilingual',
      lang: 'zh',
      states: rows.map((row) => buildLayaState(row)),
      questions: { industry: industryQuestion() },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Laya 返回 ${response.status} ${text.slice(0, 200)}`);
  }
  const body = await response.json();
  const results = body.results || body.responses;
  if (!Array.isArray(results) || results.length !== rows.length) {
    throw new Error('Laya 批量返回条数不一致');
  }
  return results.map(unwrapResult);
}

if (!databaseUrl()) {
  console.error('需要 DATABASE_URL');
  process.exitCode = 1;
} else {
  const pool = getPool();
  const url = (process.env.LAYA_URL || argValue('--url') || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const dryRun = process.argv.includes('--dry-run');
  const limitArg = Number(argValue('--limit') || 0);
  let remaining = limitArg > 0 ? limitArg : Infinity;
  let done = 0;
  let failed = 0;
  let batchErrors = 0;
  try {
    while (remaining > 0) {
      const take = Math.min(BATCH, remaining);
      const rows = await listIndustryTargets(pool, take);
      if (!rows.length) break;
      let results;
      try {
        results = await classifyBatch(url, rows);
        batchErrors = 0;
      } catch (error) {
        batchErrors += 1;
        console.error(`batch failed ${error.message}`);
        if (batchErrors >= 3) break;
        await sleep(5_000);
        continue;
      }
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        try {
          const industry = industryFromLaya(results[i]);
          if (!dryRun) await applyIndustryResult(pool, row.id, industry);
          done += 1;
          console.log(
            `${dryRun ? 'dry' : 'classified'} ${row.id} ${industry.main_industry} `
            + `raw=${industry.raw_choice} p=${industry.confidence.toFixed(2)} ${row.title || ''}`,
          );
        } catch (error) {
          failed += 1;
          console.error(`failed ${row.id} ${error.message}`);
          if (!dryRun) {
            try { await markIndustryFailed(pool, row.id, error.message); } catch { /* 下一轮再试 */ }
          }
        }
      }
      if (dryRun) break;
      if (Number.isFinite(remaining)) remaining -= rows.length;
    }
    console.log(`Laya 行业分类结束 done=${done} failed=${failed}`);
  } finally {
    await closePool();
  }
}
