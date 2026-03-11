#!/usr/bin/env bash
# 在 HashKey 测试网 133 上部署 ChallengeVerifier + BlindBoxZK + Vault
# 前置：event-contracts/.env 里 PRIVATE_KEY=0x...（有 gas 的部署账号）
set -e
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "请先: cp .env.example .env 并填写 PRIVATE_KEY（及可选 ADMIN_ADDRESS）"
  exit 1
fi

RPC_URL="${RPC_URL:-https://testnet.hsk.xyz}"

echo ">>> forge script DeployHashKeyTestnet（chain 133）..."
forge script script/DeployHashKeyTestnet.s.sol:DeployHashKeyTestnet \
  --rpc-url "$RPC_URL" \
  --broadcast \
  -vvv

BROADCAST="broadcast/DeployHashKeyTestnet.s.sol/133/run-latest.json"
if [[ -f "$BROADCAST" ]] && command -v jq >/dev/null 2>&1; then
  BOX=$(jq -r '.transactions[] | select(.contractName=="BlindBoxZK" and .transactionType=="CREATE") | .contractAddress' "$BROADCAST" | head -1)
  VAULT=$(jq -r '.transactions[] | select(.contractName=="Vault" and .transactionType=="CREATE") | .contractAddress' "$BROADCAST" | head -1)
  VERIFIER=$(jq -r '.transactions[] | select(.contractName=="ChallengeVerifier" and .transactionType=="CREATE") | .contractAddress' "$BROADCAST" | head -1)
  echo ""
  echo "=== 部署结果（写入 backend/.env）==="
  echo "BLIND_BOX_ADDRESS=$BOX"
  echo "VAULT_ADDRESS=$VAULT"
  echo "# ChallengeVerifier: $VERIFIER"
  echo ""
  echo "=== 必须：给后端 relayer 授权 OPERATOR_ROLE ==="
  echo "一键授权（推荐）："
  echo "  export BLIND_BOX_ADDRESS=$BOX"
  echo "  export VAULT_ADDRESS=$VAULT"
  echo "  export OPERATOR_ADDRESS=<后端地址>"
  echo "  bash scripts/grant-operator-133.sh"
  echo "或手动 cast："
  echo "  cast send <BOX> \"grantRole(bytes32,address)\" \$(cast keccak \"OPERATOR_ROLE\") <OPERATOR_ADDR> \\"
  echo "    --rpc-url $RPC_URL --private-key \$ADMIN_PRIVATE_KEY"
  echo ""
  echo "后端 .env 示例："
  echo "  RPC_URL=$RPC_URL"
  echo "  CHAIN_ID=133"
  echo "  BLIND_BOX_ADDRESS=$BOX"
  echo "  OPERATOR_PRIVATE_KEY=0x...   # 与上面 <OPERATOR_ADDR> 对应"
  echo "  # 未配真 ZK 前不要 submitOpen；需 Mock 请用 anvil + DeployIntegrationMock"
else
  echo "部署日志里已打印 BlindBoxZK / Vault 地址；若装了 jq 可从 $BROADCAST 解析。"
fi
