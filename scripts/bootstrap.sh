#!/usr/bin/env bash
# 接手下项目：配置好 backend/.env（+ frontend/.env.local）后一条命令装依赖、起 DB、起后端、可选自动登记、起前端
# 用法：bash scripts/bootstrap.sh
# 登记相关变量写在 backend/.env 里：REGISTER_BATCH、REGISTER_BASE_BOX_ID、REGISTER_COUNT、REGISTER_ON_CHAIN

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/backend/.env" ]]; then
  echo ">>> 请先创建 backend/.env"
  echo "    cp backend/.env.example backend/.env"
  echo "    编辑 OPERATOR_PRIVATE_KEY、BLIND_BOX_ADDRESS、RPC 等"
  exit 1
fi

# 是否自动登记（从 .env 读一行，不 source 整文件）
REGISTER_BATCH=$(grep -E '^REGISTER_BATCH=' "$ROOT/backend/.env" 2>/dev/null | cut -d= -f2 | tr -d '\r' || true)
REGISTER_BATCH="${REGISTER_BATCH:-0}"

echo "=== 1. Postgres ==="
cd "$ROOT/backend"
if docker compose ps postgres 2>/dev/null | grep -q running; then
  echo "Postgres already running."
else
  docker compose up -d postgres
  echo "Waiting for 5433..."
  for i in $(seq 1 30); do nc -z localhost 5433 2>/dev/null && break; sleep 1; done
fi
export DATABASE_URL="${DATABASE_URL:-postgresql://blindbox:blindbox@localhost:5433/blindbox}"

echo "=== 2. Backend deps + start (3001) ==="
cd "$ROOT/backend"
if [[ ! -d node_modules ]]; then
  npm install
fi
lsof -ti :3001 | xargs kill -9 2>/dev/null || true
sleep 1
( export DATABASE_URL; npm run dev ) &
BACK_PID=$!
for i in $(seq 1 30); do
  curl -sf http://127.0.0.1:3001/health >/dev/null && break
  sleep 1
done
if ! curl -sf http://127.0.0.1:3001/health >/dev/null; then
  echo "Backend failed to start. Check backend/.env"
  kill "$BACK_PID" 2>/dev/null || true
  exit 1
fi
echo "Backend OK"

if [[ "$REGISTER_BATCH" == "1" ]]; then
  echo "=== 3. Auto register boxes (from backend/.env) ==="
  bash "$ROOT/scripts/register-boxes-from-env.sh" || true
  echo ">>> 若链上 AlreadyRegistered，换 REGISTER_BASE_BOX_ID 或见 README §2.5"
fi

echo "=== 4. Frontend deps + start (3000) ==="
cd "$ROOT/frontend"
if [[ ! -f .env.local ]]; then
  echo ">>> 建议: cp frontend/.env.example frontend/.env.local 并填 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"
fi
if [[ ! -d node_modules ]]; then
  npm install
fi
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3001}"
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
sleep 1
npm run dev &
NEXT_PID=$!

echo ""
echo "=== 就绪 ==="
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:3001/health"
echo "  REGISTER_BATCH!=1 时手动登记: bash scripts/register-boxes-from-env.sh"
echo "  停服: kill $BACK_PID $NEXT_PID"
wait
