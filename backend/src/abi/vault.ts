/** Vault.sol — operator airdrop after open */
export const vaultAirdropAbi = [
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
