import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  encodeAbiParameters,
  parseAbiParameters,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "./config.js";
import { blindBoxZKAbi } from "./abi/blindBoxZK.js";

const chain = {
  id: config.chainId,
  name: "hashkey-testnet",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
} as const;

export const publicClient = createPublicClient({
  chain,
  transport: http(config.rpcUrl),
});

const account = privateKeyToAccount(config.operatorPrivateKey);

export const walletClient = createWalletClient({
  account,
  chain,
  transport: http(config.rpcUrl),
});

export async function isOpenedOnChain(boxId: bigint): Promise<boolean> {
  return publicClient.readContract({
    address: config.blindBoxAddress,
    abi: blindBoxZKAbi,
    functionName: "isOpened",
    args: [boxId],
  });
}

/**
 * Encode Groth16 proof for ChallengeVerifier: abi.encode(pA, pB, pC)
 * pA: uint256[2], pB: uint256[2][2], pC: uint256[2]
 */
export function encodeProofBytes(
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

export async function submitOpen(
  boxId: bigint,
  user: `0x${string}`,
  proofBytes: Hex,
  commitment: bigint
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    address: config.blindBoxAddress,
    abi: blindBoxZKAbi,
    functionName: "submitOpen",
    args: [boxId, user, proofBytes, commitment],
  });
  return hash;
}
