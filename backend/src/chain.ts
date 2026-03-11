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
import { vaultAirdropAbi } from "./abi/vault.js";

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

/** 避免 replacement transaction underpriced：提高 maxFee / priority，必要时重试 */
async function bumpedFeeOpts(): Promise<{
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
}> {
  try {
    const block = await publicClient.getBlock({ blockTag: "latest" });
    const base = block.baseFeePerGas ?? 0n;
    // 测试网 base 可能极低；priority 给足以便替换 pending
    const priority = 3_000_000_000n; // 3 gwei
    const maxFee = base > 0n ? base * 2n + priority : 50_000_000_000n; // 无 base 时用 50 gwei 上限
    return { maxFeePerGas: maxFee, maxPriorityFeePerGas: priority };
  } catch {
    return { gasPrice: 20_000_000_000n };
  }
}

async function writeContractWithFeeBump(
  params: Parameters<typeof walletClient.writeContract>[0]
): Promise<`0x${string}`> {
  const fees = await bumpedFeeOpts();
  const withFees = { ...params, ...fees } as typeof params;
  try {
    return await walletClient.writeContract(withFees);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m.includes("replacement transaction underpriced") || m.includes("underpriced")) {
      // 再抬一档
      const retryFees =
        fees.maxFeePerGas != null
          ? {
              maxFeePerGas: fees.maxFeePerGas * 2n,
              maxPriorityFeePerGas: (fees.maxPriorityFeePerGas ?? 1n) * 2n,
            }
          : { gasPrice: 100_000_000_000n };
      return walletClient.writeContract({ ...params, ...retryFees } as typeof params);
    }
    throw e;
  }
}

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

export async function registerBoxOnChain(boxId: bigint, commitment: bigint): Promise<`0x${string}`> {
  const hash = await writeContractWithFeeBump({
    address: config.blindBoxAddress,
    abi: blindBoxZKAbi,
    functionName: "registerBox",
    args: [boxId, commitment],
  });
  // 串行 register 必须等上一笔 mined，否则 nonce/replacement underpriced
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/** 已开盒时返回链上存的 proof 长度、commitment、时间、user；未开 revert */
export async function getOpenOnChain(boxId: bigint): Promise<{
  proofLength: number;
  commitment: string;
  timestamp: string;
  user: `0x${string}`;
} | null> {
  try {
    const r = await publicClient.readContract({
      address: config.blindBoxAddress,
      abi: blindBoxZKAbi,
      functionName: "getOpen",
      args: [boxId],
    });
    const proof = r[0] as `0x${string}`;
    const commitment = r[1] as bigint;
    const timestamp = r[2] as bigint;
    const user = r[3] as `0x${string}`;
    const proofLength = (proof.length - 2) / 2;
    return {
      proofLength,
      commitment: commitment.toString(),
      timestamp: timestamp.toString(),
      user,
    };
  } catch {
    return null;
  }
}

export async function getRegisteredCommitment(boxId: bigint): Promise<bigint> {
  return publicClient.readContract({
    address: config.blindBoxAddress,
    abi: blindBoxZKAbi,
    functionName: "getRegisteredCommitment",
    args: [boxId],
  });
}

/** Vault 给开盒用户转 native（HSK）；需 Vault 有余额且 operator 有 OPERATOR_ROLE */
export async function vaultAirdrop(winner: `0x${string}`, amountWei: bigint): Promise<`0x${string}`> {
  if (!config.vaultAddress) throw new Error("VAULT_ADDRESS not set");
  if (amountWei <= 0n) throw new Error("airdrop amount must be positive");
  const hash = await writeContractWithFeeBump({
    address: config.vaultAddress,
    abi: vaultAirdropAbi,
    functionName: "airdrop",
    args: [winner, amountWei],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function submitOpen(
  boxId: bigint,
  user: `0x${string}`,
  proofBytes: Hex,
  commitment: bigint
): Promise<`0x${string}`> {
  const hash = await writeContractWithFeeBump({
    address: config.blindBoxAddress,
    abi: blindBoxZKAbi,
    functionName: "submitOpen",
    args: [boxId, user, proofBytes, commitment],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
