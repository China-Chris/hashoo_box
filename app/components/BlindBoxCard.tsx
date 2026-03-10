"use client";

import { useState } from "react";
import Image from "next/image";

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
}: {
  title: string;
  id: number;
  remaining?: number;
  mobileTitle?: string;
  isOpen?: boolean;
  onOpen?: () => void;
  sold?: boolean;
  /** 未开启数量（与 web Unopened 一致，后续从同一后端接口取） */
  unopenedCount?: number;
  /** 总盲盒数，与 unopenedCount 配套，后续从同一后端取 */
  totalCount?: number;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [revealedItem, setRevealedItem] = useState<RevealItem | null>(null);
  const [remaining, setRemaining] = useState(initialRemaining);
  const isOpen = isOpenProp !== undefined ? isOpenProp : internalOpen;
  const disabled = sold || isOpen;

  const handleOpen = () => {
    if (disabled) return;
    const item = PLACEHOLDER_ITEMS[id % PLACEHOLDER_ITEMS.length];
    setRevealedItem(item);
    setRemaining((n) => Math.max(0, n - 1));
    onOpenCallback?.();
    if (isOpenProp === undefined) setInternalOpen(true);
  };

  return (
    <div className="group relative rounded-[28px] overflow-hidden bg-[#0a0a0a] border-2 border-violet-500/60 shadow-[0_0_24px_rgba(139,92,246,0.25)] transition-all duration-300 hover:border-violet-400 hover:shadow-[0_0_32px_rgba(139,92,246,0.35)]">
      <div className="aspect-[4/3] relative flex flex-col items-center justify-start pt-12 md:justify-center md:pt-6 p-6 bg-gradient-to-b from-[#111111] to-[#000000]">
        {sold && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 rounded-[28px]">
            <Image
              src="/sold.png"
              alt="Sold"
              width={120}
              height={120}
              className="object-contain w-24 h-24 sm:w-28 sm:h-28"
            />
          </div>
        )}
        {!isOpen ? (
          <div className="flex flex-col items-center gap-6 sm:gap-8">
            {/* 盲盒 3D 感盒子 */}
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
          </div>
        )}
      </div>
      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-semibold text-white font-nav">
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
          </div>
          <button
            onClick={handleOpen}
            disabled={disabled}
            className={`px-4 py-2 rounded-3xl text-sm font-medium transition-all duration-200 font-nav ${
              disabled
                ? "bg-white/10 text-[#71717a] cursor-not-allowed"
                : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
            }`}
          >
            {isOpen ? "Opened" : sold ? "Sold" : "Open"}
          </button>
        </div>
      </div>
    </div>
  );
}
