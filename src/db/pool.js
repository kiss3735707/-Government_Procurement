import pg from 'pg';
import { databaseUrl } from './env.js';

const { Pool } = pg;

let pool = null;

export function getPool() {
  const url = databaseUrl();
  if (!url) {
    throw new Error('DATABASE_URL 未设置。请复制 .env.example 为 .env，或先开 SSH 隧道连 10.12.64.101。');
  }
  if (!pool) {
    pool = new Pool({ connectionString: url, max: 5 });
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
