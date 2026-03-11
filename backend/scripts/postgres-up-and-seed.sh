#!/usr/bin/env bash
# Postgres 起库 + 迁移 + 登记一批盲盒，前端 GET /boxes 即有数据
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export DATABASE_URL="${DATABASE_URL:-postgresql://blindbox:blindbox@localhost:5433/blindbox}"

echo ">>> 1. 启动 Postgres（docker compose）"
docker compose up -d postgres

echo ">>> 2. 等待 5433（compose 映射端口，避免与系统 Postgres 5432 冲突）..."
for i in $(seq 1 40); do
  if nc -z localhost 5433 2>/dev/null; then break; fi
  sleep 1
done
if ! nc -z localhost 5433 2>/dev/null; then
  echo "Postgres 未就绪，请检查 docker"
  exit 1
fi

echo ">>> 3. 写入 backend/.env 的 DATABASE_URL（若尚未配置）"
if grep -q '^DATABASE_URL=' .env 2>/dev/null; then
  echo "    .env 已有 DATABASE_URL，跳过写入"
else
  echo "" >> .env
  echo "# Postgres — 列表/My 持久化" >> .env
  echo "DATABASE_URL=$DATABASE_URL" >> .env
  echo "    已追加到 .env"
fi

echo ">>> 4. 启动后端（后台）— 启动时会 initDb 建表"
lsof -i :3001 -t 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1
DATABASE_URL="$DATABASE_URL" node --import tsx src/index.ts &
BACK_PID=$!
sleep 3
if ! curl -sf http://127.0.0.1:3001/health >/dev/null; then
  echo "后端未起来，请手动: cd backend && npm run dev"
  kill $BACK_PID 2>/dev/null || true
  exit 1
fi

API="http://127.0.0.1:3001"
echo ">>> 5. 登记 20 个盒（boxId 1..20，仅 DB，不上链）"
# 电路 commit_open：commitment === salt + amount (mod r)。amount 省略为 0，故 commitment 必须等于 salt。
# 若曾用 commitment=100+i 登记过，先删掉再登记，否则 INSERT 会报 Box already registered。
echo "    清理 1..20 旧记录（若存在）…"
if command -v psql >/dev/null 2>&1; then
  psql "$DATABASE_URL" -c "DELETE FROM boxes WHERE box_id >= 1 AND box_id <= 20;" 2>/dev/null || true
else
  docker compose exec -T postgres psql -U blindbox -d blindbox -c \
    "DELETE FROM boxes WHERE box_id >= 1 AND box_id <= 20;" 2>/dev/null || true
fi
for i in $(seq 1 20); do
  SALT=$(printf "0x%02x" "$i")
  # commitment 与 SALT 数值一致（amount=0），prover 才能 fullProve
  curl -sf -X POST "$API/internal/register-box" \
    -H "Content-Type: application/json" \
    -d "{\"boxId\":\"$i\",\"commitment\":\"$i\",\"saltHex\":\"$SALT\"}" \
    | head -c 200 || true
  echo ""
done

echo ">>> 6. 抽查 GET /boxes"
curl -s "$API/boxes?limit=5" | head -c 500
echo ""

echo ">>> 7. 停掉临时后端（你可再 npm run dev 常驻）"
kill $BACK_PID 2>/dev/null || true

echo ""
echo "=== 完成 ==="
echo "  DATABASE_URL 已写入 .env（若原本没有）"
echo "  已登记 boxId 1..20；其中 id 2,4,6,7 可改为 opened 需另行 UPDATE 或走 open 流程"
echo "  请执行: cd backend && npm run dev"
echo "  前端刷新首页应看到 Hashoo#1 .. #20 来自后端（不再用本地 SOLD_BOX_IDS 那套）"
