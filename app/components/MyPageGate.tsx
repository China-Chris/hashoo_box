"use client";

import { useAccount, useChainId } from "wagmi";
import { HASHKEY_CHAIN_ID } from "../config/wagmi";
import ConnectWalletButton from "./ConnectWalletButton";

export default function MyPageGate({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isReady = Boolean(isConnected && address && chainId === HASHKEY_CHAIN_ID);

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <h2 className="text-xl font-semibold text-white font-nav mb-2">
          Connect your wallet
        </h2>
        <p className="text-white/70 text-sm font-nav mb-6 max-w-md">
          Please connect a wallet on HashKey Chain to view your blind box records and on-chain proofs.
        </p>
        <ConnectWalletButton />
      </div>
    );
  }

  return <>{children}</>;
}
