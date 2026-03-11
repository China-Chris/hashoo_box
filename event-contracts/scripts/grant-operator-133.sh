#!/usr/bin/env bash
# 在 133 上给后端 relayer 授 BlindBoxZK（及可选 Vault）的 OPERATOR_ROLE
# 必须用 ADMIN 私钥广播（与部署时 ADMIN 一致）
#
# 用法：
#   cd event-contracts
#   export BLIND_BOX_ADDRESS=0x...          # 已部署的 BlindBoxZK
#   export OPERATOR_ADDRESS=0x...           # 后端用的地址 = OPERATOR_PRIVATE_KEY 对应地址
#   export VAULT_ADDRESS=0x...              # 可选
#   # PRIVATE_KEY 已在 .env 或是 ADMIN 私钥：
#   bash scripts/grant-operator-133.sh
#
# 或一次性：
#   BLIND_BOX_ADDRESS=0x... OPERATOR_ADDRESS=0x... VAULT_ADDRESS=0x... bash scripts/grant-operator-133.sh

set -e
cd "$(dirname "$0")/.."

if [[ -z "$BLIND_BOX_ADDRESS" || -z "$OPERATOR_ADDRESS" ]]; then
  echo "请设置:"
  echo "  BLIND_BOX_ADDRESS  — BlindBoxZK 合约地址"
  echo "  OPERATOR_ADDRESS   — 后端 relayer 地址（与 backend OPERATOR_PRIVATE_KEY 对应）"
  echo "可选:"
  echo "  VAULT_ADDRESS      — Vault 地址，设了会一并授 Vault OPERATOR_ROLE"
  exit 1
fi

if [[ ! -f .env ]] && [[ -z "$PRIVATE_KEY" ]]; then
  echo "需要 ADMIN 私钥：在 .env 里写 PRIVATE_KEY= 或当前 shell export PRIVATE_KEY="
  exit 1
fi

RPC_URL="${RPC_URL:-https://testnet.hsk.xyz}"

echo ">>> GrantOperator133 broadcast..."
forge script script/GrantOperator133.s.sol:GrantOperator133 \
  --rpc-url "$RPC_URL" \
  --broadcast \
  -vvv

echo ""
echo ">>> 下一步：backend/.env"
echo "    BLIND_BOX_ADDRESS=$BLIND_BOX_ADDRESS"
echo "    OPERATOR_PRIVATE_KEY=<与 $OPERATOR_ADDRESS 对应的私钥>"
echo "    然后 cd backend && npm run dev"
