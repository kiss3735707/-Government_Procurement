import nodemailer from 'nodemailer';
import { smtpConfig } from '../db/env.js';

export function createTransport(cfg = smtpConfig()) {
  if (!cfg.host || !cfg.user) {
    throw new Error('SMTP 未配置：需要 SMTP_HOST / SMTP_USER / SMTP_PASS');
  }
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    requireTLS: Boolean(cfg.requireTLS),
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

export async function sendMail({ to, subject, text }, transport) {
  const cfg = smtpConfig();
  const tx = transport || createTransport(cfg);
  const fromAddr = cfg.fromEmail || cfg.user;
  const from = cfg.fromName ? `"${cfg.fromName}" <${fromAddr}>` : fromAddr;
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await tx.sendMail({ from, to, subject, text });
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
  throw lastErr;
}
