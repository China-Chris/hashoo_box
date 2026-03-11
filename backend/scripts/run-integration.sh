#!/usr/bin/env bash
# Start anvil, deploy MockVerifier stack, run backend integration test (no frontend).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
cd "$ROOT"

export RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
export CHAIN_ID="${CHAIN_ID:-31337}"
export MOCK_PROOF=1

pkill -f "anvil" 2>/dev/null || true
sleep 1
echo "Starting anvil..."
anvil --silent &
ANVIL_PID=$!
sleep 1

cleanup() {
  kill $ANVIL_PID 2>/dev/null || true
}
trap cleanup EXIT

echo "Deploying MockVerifier + BlindBoxZK + Vault..."
cd "$REPO/event-contracts"
forge script script/DeployIntegrationMock.s.sol:DeployIntegrationMock \
  --rpc-url "$RPC_URL" --broadcast >/dev/null

BROADCAST="$REPO/event-contracts/broadcast/DeployIntegrationMock.s.sol/31337/run-latest.json"
BOX=$(jq -r '.transactions[] | select(.contractName=="BlindBoxZK" and .transactionType=="CREATE") | .contractAddress' "$BROADCAST" | head -1)
VAULT=$(jq -r '.transactions[] | select(.contractName=="Vault" and .transactionType=="CREATE") | .contractAddress' "$BROADCAST" | head -1)

if [[ -z "$BOX" || "$BOX" == "null" ]]; then
  echo "Could not parse BlindBoxZK from $BROADCAST"
  exit 1
fi

echo "BLIND_BOX_ADDRESS=$BOX"
echo "VAULT_ADDRESS=$VAULT"

# Anvil account[0] — must match script deployer / operator
export OPERATOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export BLIND_BOX_ADDRESS="$BOX"
export VAULT_ADDRESS="$VAULT"

# Fund vault for optional airdrop step
cast send "$VAULT" --value 1ether --rpc-url "$RPC_URL" --private-key "$OPERATOR_PRIVATE_KEY" >/dev/null
echo "Vault funded 1 ETH"

cd "$ROOT"
echo "Running integration-test.ts..."
npx tsx scripts/integration-test.ts

echo "Integration OK."
