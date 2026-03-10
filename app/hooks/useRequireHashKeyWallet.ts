"use client";

import { useCallback } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { HASHKEY_CHAIN_ID } from "../config/wagmi";

export function useRequireHashKeyWallet() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const switchChain = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const isConnectedOnHashKey = Boolean(isConnected && address && chainId === HASHKEY_CHAIN_ID);

  const requireWallet = useCallback(
    (onReady: () => void) => {
      if (!isConnected || !address) {
        openConnectModal?.();
        return;
      }
      if (chainId !== HASHKEY_CHAIN_ID) {
        switchChain.mutate(
          { chainId: HASHKEY_CHAIN_ID },
          { onSuccess: onReady, onError: () => {} }
        );
        return;
      }
      onReady();
    },
    [isConnected, address, chainId, openConnectModal, switchChain]
  );

  return { isConnectedOnHashKey, requireWallet, openConnectModal };
}
