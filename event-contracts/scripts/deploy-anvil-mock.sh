#!/usr/bin/env bash
# 本地 anvil + MockVerifier 部署，输出 backend/.env 可直接用的变量（MOCK_PROOF=1）
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
cd "$ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

pkill -f "anvil" 2>/dev/null || true
sleep 1
echo ">>> 启动 anvil（后台常驻，脚本结束不会关）..."
anvil --silent &
sleep 2

echo ">>> 部署 MockVerifier + BlindBoxZK + Vault..."
forge script script/DeployIntegrationMock.s.sol:DeployIntegrationMock \
  --rpc-url "$RPC_URL" --broadcast -vvv

BROADCAST="$ROOT/broadcast/DeployIntegrationMock.s.sol/31337/run-latest.json"
if [[ ! -f "$BROADCAST" ]]; then
  echo "未找到 $BROADCAST"
  exit 1
fi

BOX=$(jq -r '.transactions[] | select(.contractName=="BlindBoxZK" and .transactionType=="CREATE") | .contractAddress' "$BROADCAST" | head -1)
VAULT=$(jq -r '.transactions[] | select(.contractName=="Vault" and .transactionType=="CREATE") | .contractAddress' "$BROADCAST" | head -1)

echo ""
echo "=== 写入 backend/.env（本地联调）==="
cat << EOF
RPC_URL=$RPC_URL
CHAIN_ID=31337
MOCK_PROOF=1
BLIND_BOX_ADDRESS=$BOX
VAULT_ADDRESS=$VAULT
OPERATOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
EOF

echo ""
echo ">>> 保持本终端 anvil 运行，另开终端："
echo "    cd backend && 把上面内容写入 .env 后 npm run dev"
echo ">>> 前端 wagmi 需切到 chain 31337 才能签 EIP-712（与后端 CHAIN_ID 一致）"
