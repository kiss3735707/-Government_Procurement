import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** 把仓库根目录 .env 载入 process.env（已有环境变量不覆盖） */
export function loadEnv() {
  const p = resolve(ROOT, '.env');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

export function databaseUrl() {
  loadEnv();
  return process.env.DATABASE_URL || '';
}

export function smtpConfig() {
  loadEnv();
  const port = Number(process.env.SMTP_PORT || 465);
  return {
    host: process.env.SMTP_HOST || '',
    port,
    secure: port === 465,
    requireTLS: port === 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || '政采信息',
    fromEmail: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    adminEmail: process.env.DIGEST_ADMIN_EMAIL || process.env.SMTP_USER || '',
    toOverride: process.env.DIGEST_TO || '',
  };
}
