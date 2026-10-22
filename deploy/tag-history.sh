#!/bin/bash
# 历史中标打标。按月调用，已成功和已放弃的会跳过。跑完写标记，避免开机重复打。
set -u
cd /opt/zfcg
mkdir -p /var/lib/zfcg
STAMP=/var/lib/zfcg/tag-history.done
LOCK=/var/lock/zfcg-tag.lock
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "已有打标在运行"
  exit 0
fi
if [[ -f "$STAMP" ]]; then
  echo "历史打标已完成 $(cat "$STAMP")"
  exit 0
fi

echo "==== 历史打标开始 $(date -Is) ===="
if ! node --input-type=module > /tmp/zfcg-tag-months.txt <<'EOF'
import { addShanghaiDay } from './src/backfill/plan.js';

const to = '2026-10-12';
let y = 2024;
let m = 1;
while (true) {
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  if (start > to) break;
  let end = start;
  let next = addShanghaiDay(end);
  while (next.slice(0, 7) === start.slice(0, 7) && next <= to) {
    end = next;
    next = addShanghaiDay(next);
  }
  console.log(`${start} ${end}`);
  m += 1;
  if (m === 13) {
    m = 1;
    y += 1;
  }
}
EOF
then
  echo "无法生成月份"
  exit 1
fi

mapfile -t RANGES < /tmp/zfcg-tag-months.txt
if [[ ${#RANGES[@]} -eq 0 ]]; then
  echo "月份列表为空"
  exit 1
fi

for range in "${RANGES[@]}"; do
  set -- $range
  echo "---- 月份 $1 $2 $(date -Is) ----"
  node src/tag-awards.js --from "$1" --to "$2" || echo "月份 $1 结束码 $?"
done

date -Is > "$STAMP"
echo "==== 历史打标结束 $(date -Is) ===="
