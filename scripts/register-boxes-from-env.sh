#!/usr/bin/env bash
# 从 backend/.env 读取 REGISTER_*，调用 register-boxes-random-amount.mjs
# 用法：后端已启动后执行
#   bash scripts/register-boxes-from-env.sh
# 或手动：
#   cd backend && REGISTER_ON_CHAIN=1 BASE_BOX_ID=7001 COUNT=25 API=http://127.0.0.1:3001 node scripts/register-boxes-random-amount.mjs

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"
cd "$ROOT/backend"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "缺少 backend/.env，请先 cp backend/.env.example backend/.env 并配置"
  exit 1
fi

# 只解析 REGISTER_* / BASE / COUNT，不 source 整份 .env（避免特殊字符问题）
getenv() {
  grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^["'\'']//;s/["'\'']$//'
}

API="${API:-http://127.0.0.1:3001}"
# mjs 读 BASE_BOX_ID、COUNT、REGISTER_ON_CHAIN、API
BASE_BOX_ID="${BASE_BOX_ID:-$(getenv REGISTER_BASE_BOX_ID)}"
COUNT="${COUNT:-$(getenv REGISTER_COUNT)}"
REGISTER_ON_CHAIN="${REGISTER_ON_CHAIN:-$(getenv REGISTER_ON_CHAIN)}"

# 新部署合约后 README 推荐从 1 开始；沿用旧合约请在 .env 里写大号段
BASE_BOX_ID="${BASE_BOX_ID:-1}"
COUNT="${COUNT:-10}"
# 未在 .env 写 REGISTER_ON_CHAIN 时默认 0，避免误对旧合约发链上 tx；新合约请在 .env 写 1
REGISTER_ON_CHAIN="${REGISTER_ON_CHAIN:-0}"

if ! curl -sf "$API/health" >/dev/null; then
  echo "后端未响应 $API/health，请先启动: cd backend && npm run dev"
  exit 1
fi

echo ">>> API=$API BASE_BOX_ID=$BASE_BOX_ID COUNT=$COUNT REGISTER_ON_CHAIN=$REGISTER_ON_CHAIN"
export API BASE_BOX_ID COUNT REGISTER_ON_CHAIN
exec node scripts/register-boxes-random-amount.mjs
