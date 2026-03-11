"use client";

import { useCallback, useState } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { fetchOpenTypedData, postOpen, getApiBase } from "../lib/mysterybox-api";

export type OpenBoxState =
  | { status: "idle" }
  | { status: "fetching" }
  | { status: "signing" }
  | { status: "submitting" }
  | { status: "success"; txHash: string }
  | { status: "error"; message: string };

/**
 * Full chain open: GET open-typed-data → signTypedData → POST open.
 * Caller should ensure wallet is on same chain as backend CHAIN_ID (EIP-712 domain).
 */
export function useOpenBox() {
  const { address } = useAccount();
  const { signTypedDataAsync, isPending: isSigning } = useSignTypedData();
  const [state, setState] = useState<OpenBoxState>({ status: "idle" });

  const openBox = useCallback(
    async (boxId: string): Promise<{ txHash: string } | { error: string }> => {
      if (!getApiBase()) return { error: "NEXT_PUBLIC_API_URL not set" };
      if (!address) return { error: "Wallet not connected" };

      setState({ status: "fetching" });
      const typed = await fetchOpenTypedData(boxId, address);
      if ("error" in typed) {
        setState({ status: "error", message: typed.error });
        return { error: typed.error };
      }

      setState({ status: "signing" });
      let signature: `0x${string}`;
      try {
        signature = await signTypedDataAsync({
          domain: typed.domain,
          types: typed.types,
          primaryType: typed.primaryType,
          message: typed.message,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Sign rejected or failed";
        setState({ status: "error", message: msg });
        return { error: msg };
      }

      setState({ status: "submitting" });
      const result = await postOpen(boxId, signature, typed.message);
      if ("error" in result) {
        const msg = result.detail ? `${result.error}: ${result.detail}` : result.error;
        setState({ status: "error", message: msg });
        return { error: msg };
      }

      setState({ status: "success", txHash: result.txHash });
      return { txHash: result.txHash };
    },
    [address, signTypedDataAsync]
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return {
    openBox,
    state,
    reset,
    isBusy:
      state.status === "fetching" ||
      state.status === "signing" ||
      state.status === "submitting" ||
      isSigning,
  };
}
