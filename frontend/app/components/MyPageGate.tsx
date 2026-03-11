"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { HASHKEY_CHAIN_ID } from "../config/wagmi";
import ConnectWalletButton from "./ConnectWalletButton";

/**
 * Wagmi 在 SSR 时 isConnected 多为 false，客户端水合后若已连接会改渲染 children，
 * 根节点从 div 变成 section，触发 hydration mismatch。先等 mount 再分支，首屏占位与 SSR 一致。
 */
export default function MyPageGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isReady = Boolean(isConnected && address && chainId === HASHKEY_CHAIN_ID);

  // 与未连接分支同 outer，避免水合后根标签突变
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6" suppressHydrationWarning>
        <div className="h-8 w-48 rounded-lg bg-white/5 animate-pulse mb-4" aria-hidden />
        <div className="h-4 w-64 rounded bg-white/5 animate-pulse mb-2" aria-hidden />
        <div className="h-4 w-56 rounded bg-white/5 animate-pulse" aria-hidden />
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <h2 className="text-xl font-semibold text-white font-nav mb-2">
          Connect your wallet
        </h2>
        <p className="text-white/70 text-sm font-nav mb-6 max-w-md">
          Please connect a wallet on HashKey Testnet (chain 133) to view your blind box records and on-chain proofs.
        </p>
        <ConnectWalletButton />
      </div>
    );
  }

  return <>{children}</>;
}
