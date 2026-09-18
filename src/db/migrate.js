#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, closePool } from './pool.js';

const schemaPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../sql/schema.sql');

export async function migrate() {
  const sql = readFileSync(schemaPath, 'utf8');
  const pool = getPool();
  await pool.query(sql);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  try {
    await migrate();
    console.log('migrate ok:', schemaPath);
  } finally {
    await closePool();
  }
}
