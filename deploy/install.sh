#!/bin/bash
# 在服务器上、/opt/zfcg 已放好代码和 .env 后执行。
set -euo pipefail
APP=/opt/zfcg
if [[ ! -f "$APP/.env" ]]; then
  echo "先把 .env 放到 $APP/.env" >&2
  exit 1
fi
if command -v timedatectl >/dev/null; then
  timedatectl set-timezone Asia/Shanghai || true
fi
install -d -m 750 /var/backups/zfcg
install -m 755 "$APP/deploy/backup.sh" /usr/local/sbin/zfcg-backup
install -m 644 "$APP/deploy/zfcg-admin.service" /etc/systemd/system/
install -m 644 "$APP/deploy/zfcg-collect.service" /etc/systemd/system/
install -m 644 "$APP/deploy/zfcg-collect.timer" /etc/systemd/system/
install -m 644 "$APP/deploy/zfcg-digest.service" /etc/systemd/system/
install -m 644 "$APP/deploy/zfcg-digest.timer" /etc/systemd/system/
install -m 644 "$APP/deploy/zfcg-backup.service" /etc/systemd/system/
install -m 644 "$APP/deploy/zfcg-backup.timer" /etc/systemd/system/
install -m 644 "$APP/deploy/zfcg-notify@.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now zfcg-admin.service
systemctl enable --now zfcg-collect.timer zfcg-digest.timer zfcg-backup.timer
if command -v ufw >/dev/null; then
  ufw status | grep -q inactive || ufw allow 8080/tcp || true
fi
echo "admin: $(systemctl is-active zfcg-admin)"
systemctl list-timers --all | grep zfcg || true
