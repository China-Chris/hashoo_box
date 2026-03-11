import type { Hex } from "viem";
import { encodeAbiParameters, parseAbiParameters } from "viem";
import { config } from "./config.js";
import type { BoxRecord } from "./db.js";
import fs from "fs";

/**
 * Real ZK (1A): snarkjs groth16.fullProve with wasm+zkey from circuits/build-real-zk.sh.
 * Circuit commit_open.circom: commitment = salt + amount (mod field). box.commitment must match.
 */
export async function proveOpen(box: BoxRecord): Promise<Hex> {
  // Runtime check so shell export MOCK_PROOF=1 wins over stale .env
  if (process.env.MOCK_PROOF === "1" || config.mockProof) {
    return "0x";
  }
  const wasm = config.circuitWasmPath;
  const zkey = config.circuitZkeyPath;
  if (!wasm || !zkey || !fs.existsSync(wasm) || !fs.existsSync(zkey)) {
    throw new Error(
      "Set CIRCUIT_WASM_PATH and CIRCUIT_ZKEY_PATH to build/commit_open_js/commit_open.wasm and commit_open_final.zkey (run event-contracts/circuits/build-real-zk.sh)"
    );
  }

  const salt = BigInt(box.saltHex);
  const amount = box.amount ?? 0n;
  const expectedCommitment = (salt + amount) % BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617"
  );
  if (expectedCommitment !== box.commitment) {
    throw new Error(
      `commitment mismatch: circuit expects salt+amount mod r = ${expectedCommitment}, box has ${box.commitment}`
    );
  }

  const snarkjs = await import("snarkjs");
  // Circuit commit_open: public input commitment; constraint commitment === salt + amount
  const input = {
    salt: salt.toString(),
    amount: amount.toString(),
    commitment: box.commitment.toString(),
  };

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasm, zkey);
  if (BigInt(publicSignals[0]) !== box.commitment) {
    throw new Error("publicSignals[0] !== box.commitment after prove");
  }

  return groth16ProofToEncodedBytes(proof as { pi_a: string[]; pi_b: string[][]; pi_c: string[] });
}

/**
 * Encode snarkjs groth16 proof to abi.encode(pA, pB, pC) for ChallengeVerifier.
 * Order matches snarkjs-generated Solidity verifiers.
 */
function groth16ProofToEncodedBytes(proof: {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}): Hex {
  const pA: [bigint, bigint] = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
  const b = proof.pi_b;
  // snarkjs groth16_exportsoliditycalldata.js: [[b0[1],b0[0]],[b1[1],b1[0]]]
  const pB: [[bigint, bigint], [bigint, bigint]] = [
    [BigInt(b[0][1]), BigInt(b[0][0])],
    [BigInt(b[1][1]), BigInt(b[1][0])],
  ];
  const pC: [bigint, bigint] = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];
  // Some verifiers expect negated pA y
  // SnarkJS pi_a/pi_b/pi_c layout must match Groth16Verifier_Real; try raw first (no G1 y negation)
  return encodeAbiParameters(parseAbiParameters("uint256[2], uint256[2][2], uint256[2]"), [
    pA,
    pB,
    pC,
  ]);
}

/** When you already have raw tuples from snarkjs export */
export function packGroth16Proof(
  pA: readonly [bigint, bigint],
  pB: readonly [readonly [bigint, bigint], readonly [bigint, bigint]],
  pC: readonly [bigint, bigint]
): Hex {
  return encodeAbiParameters(parseAbiParameters("uint256[2], uint256[2][2], uint256[2]"), [
    pA,
    pB,
    pC,
  ]);
}
