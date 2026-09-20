#!/usr/bin/env node
import { adminAuthConfig } from './admin/auth.js';
import { createAdminServer } from './admin/http.js';
import { loadEnv } from './db/env.js';

loadEnv();
const auth = adminAuthConfig();
if (!auth.pass) {
  console.error('请在 .env 设置 ADMIN_PASS 后再启动管理界面');
  process.exit(1);
}
const host = process.env.ADMIN_HOST || '127.0.0.1';
const port = Number(process.env.ADMIN_PORT || 8080);
const server = createAdminServer({ auth });
server.listen(port, host, () => {
  console.log(`admin http://${host}:${port}  user=${auth.user}`);
});
