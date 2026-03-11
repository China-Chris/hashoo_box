#!/usr/bin/env bash
# 133 上部署 ChallengeVerifier_Real + BlindBoxZK + Vault（与 commit_open 电路一致，后端 fullProve 才能过链上 verify）
# 前置：circuits/build-real-zk.sh 已跑过，Groth16Verifier_Real.sol 存在
# .env：PRIVATE_KEY + OPERATOR_ADDRESS（与 backend 一致）
set -e
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "请先: cp .env.example .env 并填写 PRIVATE_KEY、OPERATOR_ADDRESS"
  exit 1
fi

RPC_URL="${RPC_URL:-https://testnet.hsk.xyz}"

echo ">>> forge script DeployHashKeyTestnetOneKeyRealZK（chain 133）..."
forge script script/DeployHashKeyTestnetOneKeyRealZK.s.sol:DeployHashKeyTestnetOneKeyRealZK \
  --rpc-url "$RPC_URL" \
  --broadcast \
  -vvv

BROADCAST="broadcast/DeployHashKeyTestnetOneKeyRealZK.s.sol/133/run-latest.json"
if [[ -f "$BROADCAST" ]] && command -v jq >/dev/null 2>&1; then
  BOX=$(jq -r '.transactions[] | select(.contractName=="BlindBoxZK" and .transactionType=="CREATE") | .contractAddress' "$BROADCAST" | head -1)
  VAULT=$(jq -r '.transactions[] | select(.contractName=="Vault" and .transactionType=="CREATE") | .contractAddress' "$BROADCAST" | head -1)
  VERIFIER=$(jq -r '.transactions[] | select(.contractName=="ChallengeVerifier_Real" and .transactionType=="CREATE") | .contractAddress' "$BROADCAST" | head -1)
  echo ""
  echo "=== 部署结果（写入 backend/.env）==="
  echo "BLIND_BOX_ADDRESS=$BOX"
  echo "VAULT_ADDRESS=$VAULT"
  echo "# ChallengeVerifier_Real: $VERIFIER"
  echo ""
  echo ">>> 用新地址重新 registerBox（旧盒 InvalidProof 因 Verifier 已换）："
  echo "    cd backend && BASE_BOX_ID=1001 ./scripts/register-new-boxids-on-chain.sh"
else
  echo "从 broadcast 日志复制 BlindBoxZK / Vault 地址到 backend/.env"
fi
