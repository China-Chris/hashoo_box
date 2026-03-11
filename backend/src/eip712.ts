import { recoverTypedDataAddress, type Hex } from "viem";
import { config } from "./config.js";

/** Domain: chain + verifying contract = BlindBoxZK (bind intent to contract). */
export const eip712Domain = {
  name: "BlindBoxOpen",
  version: "1",
  chainId: config.chainId,
  verifyingContract: config.blindBoxAddress,
} as const;

/** Typed message: user proves intent to open boxId before deadline; nonce anti-replay. */
export const eip712Types = {
  OpenIntent: [
    { name: "boxId", type: "uint256" },
    { name: "user", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export type OpenIntentMessage = {
  boxId: bigint;
  user: `0x${string}`;
  nonce: bigint;
  deadline: bigint;
};

export async function verifyOpenSignature(
  message: OpenIntentMessage,
  signature: Hex
): Promise<`0x${string}`> {
  const address = await recoverTypedDataAddress({
    domain: eip712Domain,
    types: eip712Types,
    primaryType: "OpenIntent",
    message: {
      boxId: message.boxId,
      user: message.user,
      nonce: message.nonce,
      deadline: message.deadline,
    },
    signature,
  });
  if (address.toLowerCase() !== message.user.toLowerCase()) {
    throw new Error("Signer mismatch");
  }
  return address;
}
