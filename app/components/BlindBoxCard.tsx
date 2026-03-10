"use client";

import { useState } from "react";

type RevealItem = {
  name: string;
  rarity: string;
  color: string;
};

const PLACEHOLDER_ITEMS: RevealItem[] = [
  { name: "星云龙", rarity: "SSR", color: "from-amber-400 to-orange-500" },
  { name: "幻影猫", rarity: "SR", color: "from-violet-400 to-purple-500" },
  { name: "霓虹虎", rarity: "R", color: "from-cyan-400 to-blue-500" },
  { name: "暗夜蝠", rarity: "N", color: "from-slate-400 to-slate-600" },
];

export default function BlindBoxCard({
  title,
  id,
}: {
  title: string;
  id: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [revealedItem, setRevealedItem] = useState<RevealItem | null>(null);

  const handleOpen = () => {
    if (isOpen) return;
    const item = PLACEHOLDER_ITEMS[id % PLACEHOLDER_ITEMS.length];
    setRevealedItem(item);
    setIsOpen(true);
  };

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-[#12121a] border border-white/[0.06] transition-all duration-300 hover:border-violet-500/30 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]">
      <div className="aspect-[3/4] relative flex items-center justify-center p-6 bg-gradient-to-b from-[#1a1a26] to-[#0f0f14]">
        {!isOpen ? (
          <div className="flex flex-col items-center justify-center gap-6 sm:gap-8">
            {/* 盲盒 3D 感盒子 */}
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 shrink-0" style={{ perspective: "1000px" }}>
              <div
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600/40 via-purple-600/30 to-fuchsia-600/40 border border-white/10 shadow-inner animate-float overflow-hidden"
                style={{ transform: "rotateX(15deg) rotateY(-10deg)", transformStyle: "preserve-3d" }}
              >
                <div className="absolute inset-0 rounded-xl animate-box-shine relative" />
                <div className="absolute -inset-px rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-30 pointer-events-none" />
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#71717a] text-center font-nav">
              Mystery Box
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center">
            {revealedItem && (
              <>
                <div
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${revealedItem.color} flex items-center justify-center text-2xl font-bold text-white shadow-lg font-nav`}
                >
                  ?
                </div>
                <p className="text-lg font-semibold text-white font-nav">
                  {revealedItem.name}
                </p>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-violet-300">
                  {revealedItem.rarity}
                </span>
              </>
            )}
          </div>
        )}
      </div>
      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-white font-nav">
            {title}
          </h3>
          <button
            onClick={handleOpen}
            disabled={isOpen}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 font-nav ${
              isOpen
                ? "bg-white/10 text-[#71717a] cursor-default"
                : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
            }`}
          >
            {isOpen ? "Opened" : "Open"}
          </button>
        </div>
      </div>
    </div>
  );
}
