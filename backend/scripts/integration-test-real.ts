/**
 * Real Groth16 e2e: requires circuits built + DeployRealZK + CIRCUIT_WASM_PATH + CIRCUIT_ZKEY_PATH.
 * Box commitment must equal salt + amount (mod r) per commit_open.circom.
 */
import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { boxStore } from "../src/db.js";
import {
  eip712Domain,
  eip712Types,
  verifyOpenSignature,
  type OpenIntentMessage,
} from "../src/eip712.js";
import { isOpenedOnChain, submitOpen } from "../src/chain.js";
import { proveOpen } from "../src/prover.js";
import { config } from "../src/config.js";

const r = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const ANVIL_USER = privateKeyToAccount(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
);

async function main() {
  if (config.mockProof) {
    throw new Error("Unset MOCK_PROOF for real ZK");
  }

  const boxId = BigInt(Date.now());
  const salt = 111n;
  const amount = 222n;
  const commitment = (salt + amount) % r;
  const saltHex = ("0x" + salt.toString(16).padStart(64, "0")) as `0x${string}`;

  if (boxStore.get(boxId)) {
    console.log("Box exists");
  } else {
    boxStore.register({
      boxId,
      commitment,
      saltHex,
      amount,
      opened: false,
    });
    console.log("Registered box", boxId.toString(), "commitment", commitment.toString());
  }

  const nonce = boxStore.getNonce(ANVIL_USER.address);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const message: OpenIntentMessage = {
    boxId,
    user: ANVIL_USER.address,
    nonce,
    deadline,
  };

  const signature = await ANVIL_USER.signTypedData({
    domain: eip712Domain,
    types: eip712Types,
    primaryType: "OpenIntent",
    message: {
      boxId: message.boxId,
      user: message.user,
      nonce: message.nonce,
      deadline: message.deadline,
    },
  });
  await verifyOpenSignature(message, signature);

  const box = boxStore.get(boxId)!;
  const proofBytes = await proveOpen(box);
  console.log("Proof bytes length", (proofBytes.length - 2) / 2);

  if (await isOpenedOnChain(boxId)) {
    console.log("Already opened");
    return;
  }

  const txHash = await submitOpen(boxId, ANVIL_USER.address, proofBytes, commitment);
  console.log("submitOpen tx", txHash);
  if (!(await isOpenedOnChain(boxId))) throw new Error("isOpened false");
  console.log("Real ZK flow OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
