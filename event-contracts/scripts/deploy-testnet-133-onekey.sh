#!/usr/bin/env bash
# 133 单私钥部署：deployer 即 admin，并立即给 OPERATOR_ADDRESS 授 OPERATOR_ROLE
# 需要 event-contracts/.env 里 PRIVATE_KEY；当前 shell 或 .env 里 OPERATOR_ADDRESS
set -e
cd "$(dirname "$0")/.."

if [[ -z "$OPERATOR_ADDRESS" ]]; then
  echo "请设置 OPERATOR_ADDRESS=0x...（后端 relayer，与 OPERATOR_PRIVATE_KEY 对应）"
  exit 1
fi
if [[ ! -f .env ]]; then
  echo "请准备 .env 里的 PRIVATE_KEY（deployer，将同时作为 admin）"
  exit 1
fi

RPC_URL="${RPC_URL:-https://testnet.hsk.xyz}"

echo ">>> DeployHashKeyTestnetOneKey + grant OPERATOR..."
forge script script/DeployHashKeyTestnetOneKey.s.sol:DeployHashKeyTestnetOneKey \
  --rpc-url "$RPC_URL" \
  --broadcast \
  -vvv

BROADCAST="broadcast/DeployHashKeyTestnetOneKey.s.sol/133/run-latest.json"
if [[ -f "$BROADCAST" ]] && command -v jq >/dev/null 2>&1; then
  BOX=$(jq -r '.transactions[] | select(.contractName=="BlindBoxZK" and .transactionType=="CREATE") | .contractAddress' "$BROADCAST" | head -1)
  VAULT=$(jq -r '.transactions[] | select(.contractName=="Vault" and .transactionType=="CREATE") | .contractAddress' "$BROADCAST" | head -1)
  echo ""
  echo "=== backend/.env（更新这两行即可）==="
  echo "BLIND_BOX_ADDRESS=$BOX"
  echo "VAULT_ADDRESS=$VAULT"
fi
