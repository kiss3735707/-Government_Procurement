#!/bin/bash
# pg_dump 当日库，保留 30 天。由 zfcg-backup.service 调用。
set -euo pipefail
APP=/opt/zfcg
DIR=/var/backups/zfcg
mkdir -p "$DIR"
if [[ ! -f "$APP/.env" ]]; then
  echo "missing $APP/.env" >&2
  exit 1
fi
DATABASE_URL=$(grep -E '^DATABASE_URL=' "$APP/.env" | tail -n1 | cut -d= -f2-)
if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL empty" >&2
  exit 1
fi
STAMP=$(TZ=Asia/Shanghai date +%F)
FILE="$DIR/zfcg-$STAMP.sql.gz"
pg_dump "$DATABASE_URL" | gzip -c > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
find "$DIR" -name 'zfcg-*.sql.gz' -mtime +30 -delete
echo "backup $FILE"
