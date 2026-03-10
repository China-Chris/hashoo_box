"use client";

import { useState } from "react";
import BlindBoxCard from "./BlindBoxCard";

const PAGE_SIZE = 8; // 每页 8 个，桌面端 4 列 x 2 行

type Box = { id: number; title: string; remaining: number };

export default function BlindBoxPagination({ boxes }: { boxes: Box[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(boxes.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageBoxes = boxes.slice(start, start + PAGE_SIZE);

  return (
    <>
      {/* 翻页器：仅网页端显示，在 Discovery Hashoo 下面 */}
      <div className="hidden md:flex items-center justify-center gap-2 py-4">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="上一页"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`min-w-[32px] h-8 px-2 rounded-xl text-sm font-medium transition-colors ${
                p === page
                  ? "bg-violet-500/80 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="下一页"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 移动端：只显示第 1 个 */}
      <div className="md:hidden">
        <div className="grid grid-cols-1 gap-6">
          <BlindBoxCard
            id={boxes[0].id}
            title={boxes[0].title}
            remaining={boxes[0].remaining}
            mobileTitle="HashooSeries"
          />
        </div>
      </div>

      {/* 网页端：每页 8 个，4 列 x 2 行 */}
      <div className="hidden md:grid md:grid-cols-4 md:grid-rows-2 gap-6">
        {pageBoxes.map((box) => (
          <BlindBoxCard
            key={box.id}
            id={box.id}
            title={box.title}
            remaining={box.remaining}
          />
        ))}
      </div>
    </>
  );
}
