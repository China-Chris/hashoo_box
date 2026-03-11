#!/usr/bin/env bash
# 用新 boxId 在 DB + 链上 registerBox，commitment 与 salt 一致（amount=0），prover 才能 fullProve。
# 旧 boxId 1..20 若链上已是 101 等错误 commitment，改用本脚本区间即可。
#
# 用法：
#   cd backend && ./scripts/register-new-boxids-on-chain.sh
#   BASE_BOX_ID=2001 COUNT=10 API=http://127.0.0.1:3001 ./scripts/register-new-boxids-on-chain.sh
#
# 依赖：后端已启动；.env 里 BLIND_BOX_ADDRESS、OPERATOR_PRIVATE_KEY、RPC；操作员有 OPERATOR_ROLE。
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API="${API:-http://127.0.0.1:3001}"
BASE_BOX_ID="${BASE_BOX_ID:-1001}"
COUNT="${COUNT:-20}"

echo ">>> API=$API  BASE_BOX_ID=$BASE_BOX_ID  COUNT=$COUNT"
echo ">>> 每个盒: commitment = salt = 1..$COUNT（saltHex 0x01..），boxId = BASE + index"
echo ">>> 后端 registerBoxOnChain 已按笔 waitForTransactionReceipt，可串行跑满；若仍 underpriced 可 sleep 2 再跑"
echo ">>> 若某 boxId 链上 AlreadyRegistered，换更大的 BASE_BOX_ID 或跳过已登记 id"
echo ""

if ! curl -sf "$API/health" >/dev/null; then
  echo "后端未响应 $API/health，请先: cd backend && npm run dev"
  exit 1
fi

for i in $(seq 1 "$COUNT"); do
  BOX_ID=$((BASE_BOX_ID + i - 1))
  SALT=$(printf "0x%02x" "$i")
  # commitment 必须等于 salt（amount 省略为 0），与 commit_open 电路一致
  TMP="${TMPDIR:-/tmp}/register-box-$$.json"
  CODE=$(curl -s -o "$TMP" -w "%{http_code}" -X POST "$API/internal/register-box" \
    -H "Content-Type: application/json" \
    -d "{\"boxId\":\"$BOX_ID\",\"commitment\":\"$i\",\"saltHex\":\"$SALT\",\"registerOnChain\":true}")
  BODY=$(cat "$TMP")
  if echo "$BODY" | grep -q registerTxHash; then
    echo "boxId=$BOX_ID commitment=$i salt=$SALT -> $BODY"
  elif echo "$BODY" | grep -q "already registered\|23505\|Box already registered"; then
    echo "boxId=$BOX_ID 已在 DB 存在，跳过（可先 psql DELETE 该 box_id 再跑）"
  else
    echo "boxId=$BOX_ID http=$CODE $BODY"
    if [ "$CODE" != "200" ]; then
      echo "若链上 revert AlreadyRegistered，换 BASE_BOX_ID；若无 OPERATOR_ROLE 先 grantRole。"
    fi
  fi
done

echo ""
echo ">>> 抽查 GET /boxes?limit=5"
curl -s "$API/boxes?limit=5" | head -c 400
echo ""
echo ""
echo "前端需用新 boxId（$BASE_BOX_ID .. $((BASE_BOX_ID + COUNT - 1))）开盒；旧 1..20 可不再使用。"
