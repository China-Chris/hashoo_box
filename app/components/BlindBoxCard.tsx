"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRequireHashKeyWallet } from "../hooks/useRequireHashKeyWallet";
import { useOpenBox } from "../hooks/useOpenBox";
import { getApiBase } from "../lib/mysterybox-api";

type RevealItem = { amount: number };

const PLACEHOLDER_ITEMS: RevealItem[] = Array.from({ length: 10 }, (_, i) => ({ amount: i + 1 }));

export default function BlindBoxCard({
  title,
  id,
  remaining: initialRemaining = 0,
  mobileTitle,
  isOpen: isOpenProp,
  onOpen: onOpenCallback,
  sold = false,
  unopenedCount,
  totalCount = 20,
  onOpenClick,
  /** 后端盒 ID（字符串）；有则走 EIP-712 + POST open，不再用本地假开盒 */
  chainBoxId,
  /** 链上开盒成功后回调（如刷新列表） */
  onChainOpenSuccess,
}: {
  title: string;
  id: number;
  remaining?: number;
  mobileTitle?: string;
  isOpen?: boolean;
  onOpen?: () => void;
  sold?: boolean;
  unopenedCount?: number;
  totalCount?: number;
  onOpenClick?: () => void;
  chainBoxId?: string;
  onChainOpenSuccess?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [revealedItem, setRevealedItem] = useState<RevealItem | null>(null);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [chainError, setChainError] = useState<string | null>(null);
  const isOpen = isOpenProp !== undefined ? isOpenProp : internalOpen;
  const disabled = sold || isOpen;
  const { requireWallet } = useRequireHashKeyWallet();
  const { openBox, state, reset, isBusy } = useOpenBox();

  const useChainOpen = Boolean(chainBoxId && getApiBase());

  useEffect(() => {
    if (state.status === "success") {
      setRevealedItem(PLACEHOLDER_ITEMS[id % PLACEHOLDER_ITEMS.length]);
      setRemaining((n) => Math.max(0, n - 1));
      onOpenCallback?.();
      if (isOpenProp === undefined) setInternalOpen(true);
      onChainOpenSuccess?.();
      reset();
    }
  }, [state.status, id, isOpenProp, onOpenCallback, onChainOpenSuccess, reset]);

  const handleOpen = async () => {
    if (disabled || isBusy) return;
    setChainError(null);

    if (useChainOpen && chainBoxId) {
      const result = await openBox(chainBoxId);
      if ("error" in result) setChainError(result.error);
      return;
    }

    const item = PLACEHOLDER_ITEMS[id % PLACEHOLDER_ITEMS.length];
    setRevealedItem(item);
    setRemaining((n) => Math.max(0, n - 1));
    onOpenCallback?.();
    if (isOpenProp === undefined) setInternalOpen(true);
  };

  const buttonDisabled = disabled || (useChainOpen && isBusy);
  const buttonLabel = isOpen
    ? "Opened"
    : sold
      ? "Sold"
      : useChainOpen && isBusy
        ? state.status === "signing"
          ? "Sign in wallet…"
          : state.status === "submitting"
            ? "Submitting…"
            : "Loading…"
        : "Open";

  return (
    <div className="group relative rounded-[28px] overflow-hidden bg-[#0a0a0a] border-2 border-violet-500/60 shadow-[0_0_24px_rgba(139,92,246,0.25)] transition-all duration-300 hover:border-violet-400 hover:shadow-[0_0_32px_rgba(139,92,246,0.35)]">
      <div className="aspect-[4/3] relative flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#111111] to-[#000000]">
        {/* sold：底层仍是 box-cover，上面只盖 Sold 图（不要硬币 / View in My） */}
        {sold ? (
          <div className="relative flex flex-col items-center justify-center w-full h-full min-h-[200px]">
            {/* 与未开盒相同的盒子图，作为 Sold 底下的底图 */}
            <div className="relative w-44 h-44 sm:w-40 sm:h-40 shrink-0 opacity-60" style={{ perspective: "1000px" }}>
              <div
                className="absolute inset-0 rounded-2xl border border-white/10 shadow-inner overflow-hidden bg-[#0f0f14]"
                style={{ transform: "rotateX(15deg) rotateY(-10deg)", transformStyle: "preserve-3d" }}
              >
                <Image
                  src="/box-cover.png"
                  alt=""
                  width={160}
                  height={160}
                  className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[28px] bg-black/40">
              <Image
                src="/sold.png"
                alt="Sold"
                width={120}
                height={120}
                className="object-contain w-24 h-24 sm:w-28 sm:h-28 drop-shadow-lg"
              />
            </div>
          </div>
        ) : !isOpen ? (
          <div className="flex flex-col items-center gap-6 sm:gap-8 justify-start pt-12 md:justify-center md:pt-6 w-full">
            <div className="relative w-44 h-44 sm:w-40 sm:h-40 shrink-0" style={{ perspective: "1000px" }}>
              <div
                className="absolute inset-0 rounded-2xl border border-white/10 shadow-inner animate-float overflow-hidden bg-[#0f0f14]"
                style={{ transform: "rotateX(15deg) rotateY(-10deg)", transformStyle: "preserve-3d" }}
              >
                <Image
                  src="/box-cover.png"
                  alt="Mystery Box"
                  width={160}
                  height={160}
                  className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full min-h-full flex flex-col items-center justify-start pt-12 gap-3 text-center md:justify-center md:pt-0">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center overflow-hidden shadow-lg bg-transparent">
              <Image
                src="/revealed-token.png"
                alt="Revealed"
                width={80}
                height={80}
                className="object-contain w-full h-full"
              />
            </div>
            {revealedItem && (
              <p className="text-lg font-semibold text-white font-nav">
                {revealedItem.amount} HSK
              </p>
            )}
            <a
              href="/my"
              className="inline-flex items-center gap-1 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors font-nav mt-1"
            >
              View in My
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h3 className="font-semibold text-white font-nav truncate">
              {mobileTitle != null ? (
                <>
                  <span className="md:hidden">{mobileTitle}</span>
                  <span className="hidden md:inline">{title}</span>
                </>
              ) : (
                title
              )}
            </h3>
            <span className="md:hidden text-xs text-white font-nav">
              {unopenedCount !== undefined ? `${unopenedCount}/${totalCount}` : `${remaining}/${totalCount}`}
            </span>
            {chainError && (
              <span className="text-xs text-red-400 mt-1 line-clamp-2" title={chainError}>
                {chainError}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              if (buttonDisabled) return;
              requireWallet(() => {
                if (onOpenClick && !useChainOpen) {
                  onOpenClick();
                  return;
                }
                if (onOpenClick && useChainOpen) {
                  onOpenClick();
                  return;
                }
                void handleOpen();
              });
            }}
            disabled={buttonDisabled}
            className={`shrink-0 px-4 py-2 rounded-3xl text-sm font-medium transition-all duration-200 font-nav ${
              buttonDisabled
                ? "bg-white/10 text-[#71717a] cursor-not-allowed"
                : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
            }`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
