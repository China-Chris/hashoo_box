import "dotenv/config";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const config = {
  rpcUrl: process.env.RPC_URL ?? "https://testnet.hsk.xyz",
  chainId: Number(process.env.CHAIN_ID ?? 133),
  operatorPrivateKey: req("OPERATOR_PRIVATE_KEY") as `0x${string}`,
  blindBoxAddress: req("BLIND_BOX_ADDRESS") as `0x${string}`,
  vaultAddress: process.env.VAULT_ADDRESS as `0x${string}` | undefined,
  /** 开盒成功后 Vault.airdrop 默认金额（wei）；盒子上未单独配 reward_wei 时用 */
  openRewardWei:
    process.env.OPEN_REWARD_WEI && process.env.OPEN_REWARD_WEI !== "0"
      ? BigInt(process.env.OPEN_REWARD_WEI)
      : 0n,
  circuitWasmPath: process.env.CIRCUIT_WASM_PATH,
  circuitZkeyPath: process.env.CIRCUIT_ZKEY_PATH,
  mockProof: process.env.MOCK_PROOF === "1",
};
