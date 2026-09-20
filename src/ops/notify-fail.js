#!/usr/bin/env node
/** systemd OnFailure：把失败单元名发到 DIGEST_ADMIN_EMAIL */
import { smtpConfig } from '../db/env.js';
import { sendMail } from '../digest/send.js';

const unit = process.argv[2] || 'unknown';
const cfg = smtpConfig();
const to = cfg.adminEmail || cfg.user;
if (!to) {
  console.error('DIGEST_ADMIN_EMAIL / SMTP_USER 未配置，无法告警');
  process.exit(1);
}
await sendMail({
  to,
  subject: `【政采】任务失败 ${unit}`,
  text: `systemd 单元 ${unit} 失败。\n请在服务器执行：\n  journalctl -u ${unit} -n 80 --no-pager\n`,
});
console.log(JSON.stringify({ ok: true, to, unit }));
