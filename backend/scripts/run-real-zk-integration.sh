#!/usr/bin/env bash
# Full real ZK: build circuit -> deploy ChallengeVerifier_Real + BlindBoxZK -> integration-test-real
set -e
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
CIRC="$REPO/event-contracts/circuits"
BACK="$REPO/backend"

cd "$CIRC"
if [[ ! -f build/commit_open_final.zkey ]] && [[ ! -f build/commit_open_0000.zkey ]]; then
  echo "Building circuit (circom + snarkjs required)..."
  chmod +x build-real-zk.sh
  ./build-real-zk.sh
fi

WASM=$(find build -name "commit_open.wasm" 2>/dev/null | head -1)
ZKEY="build/commit_open_final.zkey"
if [[ -z "$WASM" || ! -f "$ZKEY" ]]; then
  echo "Missing wasm or zkey. Run $CIRC/build-real-zk.sh manually."
  exit 1
fi

pkill -f anvil 2>/dev/null || true
sleep 1
anvil --silent &
sleep 1
trap 'kill %1 2>/dev/null || true' EXIT

cd "$REPO/event-contracts"
forge script script/DeployRealZK.s.sol:DeployRealZK --rpc-url http://127.0.0.1:8545 --broadcast >/dev/null
BOX=$(jq -r '.transactions[] | select(.contractName=="BlindBoxZK" and .transactionType=="CREATE") | .contractAddress' \
  broadcast/DeployRealZK.s.sol/31337/run-latest.json | head -1)

export RPC_URL=http://127.0.0.1:8545
export CHAIN_ID=31337
export MOCK_PROOF=0
export OPERATOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export BLIND_BOX_ADDRESS="$BOX"
export CIRCUIT_WASM_PATH="$CIRC/$WASM"
export CIRCUIT_ZKEY_PATH="$CIRC/$ZKEY"

echo "BLIND_BOX=$BOX"
echo "WASM=$CIRCUIT_WASM_PATH"
cd "$BACK"
npm install 2>/dev/null || true
npx tsx scripts/integration-test-real.ts
