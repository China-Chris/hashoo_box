#!/usr/bin/env bash
# Build wasm + zkey + export Solidity verifier (real Groth16).
# Uses npx circom2 + npx snarkjs if globals missing.
set -e
cd "$(dirname "$0")"
CIRCUIT=commit_open
PTAU=pot12_final.ptau

# Prefer global; else npx from local node_modules (npm install in this dir)
if command -v circom &>/dev/null; then
  CIRCOM=(circom)
elif command -v circom2 &>/dev/null; then
  CIRCOM=(circom2)
else
  CIRCOM=(npx circom2)
fi
if command -v snarkjs &>/dev/null; then
  SNARKJS=(snarkjs)
else
  SNARKJS=(npx snarkjs)
fi

if [[ ! -d node_modules ]] || [[ ! -f node_modules/snarkjs/package.json ]]; then
  echo "Installing circom2 + snarkjs locally..."
  npm install
fi

if [[ ! -f "$PTAU" ]]; then
  echo "Generating local $PTAU (Hermez URL often 403)..."
  "${SNARKJS[@]}" powersoftau new bn128 12 pot12_0000.ptau -v
  "${SNARKJS[@]}" powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name=hashoo -v -e=1
  "${SNARKJS[@]}" powersoftau prepare phase2 pot12_0001.ptau "$PTAU" -v
fi

mkdir -p build
echo "Compiling $CIRCUIT with ${CIRCOM[*]}..."
"${CIRCOM[@]}" ${CIRCUIT}.circom --r1cs --wasm -o build

if [[ -f "build/${CIRCUIT}_js/${CIRCUIT}.wasm" ]]; then
  WASM="build/${CIRCUIT}_js/${CIRCUIT}.wasm"
elif [[ -f "build/${CIRCUIT}.wasm" ]]; then
  WASM="build/${CIRCUIT}.wasm"
else
  WASM=$(find build -name "${CIRCUIT}.wasm" | head -1)
fi
if [[ -z "$WASM" || ! -f "$WASM" ]]; then
  echo "Wasm not found under build/"; ls -la build; exit 1
fi
echo "Using wasm: $WASM"

R1CS="build/${CIRCUIT}.r1cs"
[[ -f "$R1CS" ]] || R1CS=$(find build -name "${CIRCUIT}.r1cs" | head -1)
if [[ ! -f "$R1CS" ]]; then echo "r1cs not found"; exit 1; fi

echo "Groth16 setup..."
"${SNARKJS[@]}" groth16 setup "$R1CS" "$PTAU" build/${CIRCUIT}_0000.zkey
"${SNARKJS[@]}" zkey contribute build/${CIRCUIT}_0000.zkey build/${CIRCUIT}_final.zkey --name="hashoo" -v -e="$(date +%s)"
"${SNARKJS[@]}" zkey export verificationkey build/${CIRCUIT}_final.zkey build/verification_key.json

echo "Export Solidity verifier -> circuits/verifier.sol then src/Groth16Verifier_Real.sol"
"${SNARKJS[@]}" zkey export solidityverifier build/${CIRCUIT}_final.zkey 2>/dev/null > verifier.sol
sed 's/contract Groth16Verifier/contract Groth16VerifierReal/' verifier.sol > ../src/Groth16Verifier_Real.sol

# macOS sed
if grep -q "^contract Verifier " ../src/Groth16Verifier_Real.sol 2>/dev/null; then
  sed -i.bak 's/^contract Verifier /contract Groth16VerifierReal /' ../src/Groth16Verifier_Real.sol
fi

echo "Done."
echo "  WASM=$WASM"
echo "  ZKEY=build/${CIRCUIT}_final.zkey"
echo "  ../src/Groth16Verifier_Real.sol"
