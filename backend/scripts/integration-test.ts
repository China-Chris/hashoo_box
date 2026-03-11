/**
 * End-to-end without frontend: register box -> sign OpenIntent -> submitOpen -> isOpened.
 * Requires: anvil + DeployIntegrationMock, env MOCK_PROOF=1, CHAIN_ID=31337, BLIND_BOX_ADDRESS, OPERATOR_PRIVATE_KEY=anvil[0].
 */
import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, parseEther } from "viem";
import { config } from "../src/config.js";
import { boxStore } from "../src/db.js";
import {
  eip712Domain,
  eip712Types,
  verifyOpenSignature,
  type OpenIntentMessage,
} from "../src/eip712.js";
import { isOpenedOnChain, submitOpen, walletClient } from "../src/chain.js";
import { proveOpen } from "../src/prover.js";
const ANVIL_USER = privateKeyToAccount(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
);

async function main() {
  if (!config.mockProof) {
    throw new Error("Set MOCK_PROOF=1 and deploy BlindBoxZK with MockVerifier (see run-integration.sh)");
  }
  if (config.chainId !== 31337) {
    console.warn("Expected CHAIN_ID=31337 for anvil integration");
  }

  const boxId = 1001n;
  const commitment = 123456789n;
  const saltHex =
    "0x0000000000000000000000000000000000000000000000000000000000000001" as `0x${string}`;

  // Reset memory store if re-run in same process
  if (boxStore.get(boxId)) {
    console.log("Box already in store; using existing");
  } else {
    boxStore.register({
      boxId,
      commitment,
      saltHex,
      opened: false,
    });
    console.log("Registered box", boxId.toString());
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
  console.log("EIP-712 signature ok");

  const box = boxStore.get(boxId)!;
  const proofBytes = await proveOpen(box);
  console.log("Prover returned", proofBytes === "0x" ? "0x (mock)" : "bytes");

  if (await isOpenedOnChain(boxId)) {
    console.log("Already opened on chain");
    return;
  }

  const txHash = await submitOpen(boxId, ANVIL_USER.address, proofBytes, commitment);
  console.log("submitOpen tx", txHash);

  const opened = await isOpenedOnChain(boxId);
  if (!opened) throw new Error("isOpened still false after submitOpen");
  console.log("isOpened(boxId) = true — flow ok");

  boxStore.markOpened(boxId);
  boxStore.bumpNonce(ANVIL_USER.address);

  // Optional: Vault airdrop smoke (fund vault first)
  if (config.vaultAddress) {
    const pc = createPublicClient({
      chain: { id: config.chainId, rpcUrls: { default: { http: [config.rpcUrl] } } } as never,
      transport: http(config.rpcUrl),
    });
    const vaultBal = await pc.getBalance({ address: config.vaultAddress });
    if (vaultBal > 0n) {
      const vaultAbi = [
        {
          type: "function",
          name: "airdrop",
          inputs: [
            { name: "winner", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
      ] as const;
      const hash = await walletClient.writeContract({
        address: config.vaultAddress,
        abi: vaultAbi,
        functionName: "airdrop",
        args: [ANVIL_USER.address, parseEther("0.01")],
      });
      console.log("Vault.airdrop tx", hash);
    } else {
      console.log("Vault empty — skip airdrop (fund with cast send vault --value 1ether)");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
