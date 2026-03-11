#!/usr/bin/env bash
# 一键拉起：Postgres → Backend → Next（133 测试联调）
# 用法：bash scripts/start-all.sh
# 前置：backend/.env 已填 OPERATOR_PRIVATE_KEY、BLIND_BOX_ADDRESS 等

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== 1. Postgres (backend/docker-compose.yml) ==="
cd "$ROOT/backend"
if docker compose ps postgres 2>/dev/null | grep -q running; then
  echo "Postgres already running."
else
  docker compose up -d postgres
  echo "Waiting for Postgres on 5432..."
  for i in $(seq 1 30); do
    if nc -z localhost 5432 2>/dev/null; then break; fi
    sleep 1
  done
fi

if ! nc -z localhost 5432 2>/dev/null; then
  echo "WARN: 5432 not open — backend 可去掉 DATABASE_URL 用内存（重启丢数据）"
else
  export DATABASE_URL="${DATABASE_URL:-postgresql://blindbox:blindbox@localhost:5432/blindbox}"
  echo "DATABASE_URL set for backend."
fi

echo "=== 2. Backend (port 3001) ==="
cd "$ROOT/backend"
if [[ ! -f .env ]]; then
  echo "ERROR: backend/.env 不存在。请："
  echo "  cp backend/.env.example backend/.env"
  echo "  编辑 BLIND_BOX_ADDRESS、OPERATOR_PRIVATE_KEY、CHAIN_ID=133、RPC_URL"
  echo "  真 ZK 或 MOCK_PROOF=1"
  exit 1
fi
# 在子 shell 里带 DATABASE_URL 启动
(
  export DATABASE_URL="${DATABASE_URL:-postgresql://blindbox:blindbox@localhost:5432/blindbox}"
  npm run dev
) &
BACK_PID=$!
sleep 2
if ! curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/health | grep -q 200; then
  echo "Backend may still be starting or failed — check backend logs (OPERATOR_PRIVATE_KEY / BLIND_BOX_ADDRESS)."
else
  echo "Backend OK http://localhost:3001/health"
fi

echo "=== 3. Next (port 3000) ==="
cd "$ROOT"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3001}"
echo "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"
npm run dev &
NEXT_PID=$!

echo ""
echo "=== 就绪 ==="
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:3001/health"
echo "  停服: kill $BACK_PID $NEXT_PID 或 Ctrl+C 后 docker compose -f backend/docker-compose.yml down"
wait
