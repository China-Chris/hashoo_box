/**
 * Minimal ABI for BlindBoxZK — submitOpen + isOpened.
 * Full artifact can be swapped from forge build out/ if needed.
 */
export const blindBoxZKAbi = [
  {
    type: "function",
    name: "submitOpen",
    inputs: [
      { name: "boxId", type: "uint256" },
      { name: "user", type: "address" },
      { name: "proof", type: "bytes" },
      { name: "commitment", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isOpened",
    inputs: [{ name: "boxId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;
