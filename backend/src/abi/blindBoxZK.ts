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
  {
    type: "function",
    name: "registerBox",
    inputs: [
      { name: "boxId", type: "uint256" },
      { name: "commitment", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getOpen",
    inputs: [{ name: "boxId", type: "uint256" }],
    outputs: [
      { name: "proof", type: "bytes" },
      { name: "commitment", type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "user", type: "address" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRegisteredCommitment",
    inputs: [{ name: "boxId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
