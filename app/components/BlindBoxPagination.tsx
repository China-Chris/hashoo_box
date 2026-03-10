"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import BlindBoxCard from "./BlindBoxCard";

const PAGE_SIZE = 8; // 每页 8 个，桌面端 4 列 x 2 行
const TOTAL_BOXES = 20; // 总盲盒数，后续从后端接口取
const SOLD_BOX_IDS = new Set([0, 2, 4, 7]); // Hashoo#1, #3, #5, #8 已售

type Box = { id: number; title: string; remaining: number };

export default function BlindBoxPagination({ boxes }: { boxes: Box[] }) {
  const [page, setPage] = useState(1);
  const [openedIds, setOpenedIds] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<"all" | "unopened">("all");
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null);
  const [pickerFilter, setPickerFilter] = useState<"all" | "unopened">("all");
  const [pickerPage, setPickerPage] = useState(1);

  // 未开启数量 = 总数 - 已售 - 已开启（与后端接口一致，目前用常量 20）
  const remainingUnopened = TOTAL_BOXES - SOLD_BOX_IDS.size - openedIds.size;

  // Unopened：只排除已售，不排除本次已开启（开启后仍留在列表直到刷新）
  const filteredBoxes = useMemo(
    () =>
      filter === "unopened"
        ? boxes.filter((b) => !SOLD_BOX_IDS.has(b.id))
        : boxes,
    [boxes, filter]
  );
  const totalPages = Math.max(1, Math.ceil(filteredBoxes.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageBoxes = filteredBoxes.slice(start, start + PAGE_SIZE);

  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, Math.min(totalPages, newPage)));
  };

  const handleFilterChange = (f: "all" | "unopened") => {
    setFilter(f);
    setPage(1);
  };

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // 移动端选号弹层：筛选与分页
  const pickerNumbers = useMemo(
    () =>
      pickerFilter === "unopened"
        ? Array.from({ length: TOTAL_BOXES }, (_, i) => i + 1).filter((num) => !SOLD_BOX_IDS.has(num - 1))
        : Array.from({ length: TOTAL_BOXES }, (_, i) => i + 1),
    [pickerFilter]
  );
  const pickerTotalPages = Math.max(1, Math.ceil(pickerNumbers.length / PAGE_SIZE));
  const pickerSafePage = Math.min(pickerPage, pickerTotalPages);
  const pickerPageNumbers = pickerNumbers.slice(
    (pickerSafePage - 1) * PAGE_SIZE,
    pickerSafePage * PAGE_SIZE
  );

  const openMobilePicker = () => {
    setPickerPage(1);
    setMobilePickerOpen(true);
  };

  useEffect(() => {
    if (pickerPage > pickerTotalPages) setPickerPage(pickerTotalPages);
  }, [pickerTotalPages, pickerPage]);

  return (
    <>
      {/* 翻页器 + 筛选：仅网页端显示 */}
      <div className="hidden md:flex items-center justify-center gap-6 py-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={safePage <= 1}
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
                  p === safePage
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
            onClick={() => handlePageChange(page + 1)}
            disabled={safePage >= totalPages}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="下一页"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
          <button
            type="button"
            onClick={() => handleFilterChange("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "all" ? "bg-violet-500/80 text-white" : "text-white/70 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("unopened")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "unopened" ? "bg-violet-500/80 text-white" : "text-white/70 hover:text-white"
            }`}
          >
            Unopened
          </button>
        </div>
      </div>

      {/* 移动端：只显示第 1 个，Open 弹出选号列表 */}
      <div className="md:hidden">
        <div className="grid grid-cols-1 gap-6">
          <BlindBoxCard
            id={boxes[0].id}
            title={boxes[0].title}
            remaining={boxes[0].remaining}
            mobileTitle="HashooSeries"
            unopenedCount={remainingUnopened}
            totalCount={TOTAL_BOXES}
            isOpen={openedIds.has(boxes[0].id)}
            onOpen={() => setOpenedIds((prev) => new Set(prev).add(boxes[0].id))}
            onOpenClick={openMobilePicker}
          />
        </div>
      </div>

      {/* 移动端：选择开启几号 - 弹层（含 All/Unopened + 分页） */}
      {mobilePickerOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/90 flex flex-col items-center justify-center p-6 overflow-auto">
          {selectedBoxId === null ? (
            <>
              <p className="text-white font-medium mb-3">选择开启几号</p>
              <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setPickerFilter("all");
                    setPickerPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pickerFilter === "all" ? "bg-violet-500/80 text-white" : "text-white/70"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPickerFilter("unopened");
                    setPickerPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pickerFilter === "unopened" ? "bg-violet-500/80 text-white" : "text-white/70"
                  }`}
                >
                  Unopened
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3 w-full max-w-xs mb-4">
                {pickerPageNumbers.map((num) => {
                  const id = num - 1;
                  const isSold = SOLD_BOX_IDS.has(id);
                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={isSold}
                      onClick={() => {
                        setSelectedBoxId(id);
                        setOpenedIds((prev) => new Set(prev).add(id));
                      }}
                      className={`h-12 rounded-xl text-sm font-medium transition-colors ${
                        isSold
                          ? "bg-white/10 text-white/40 cursor-not-allowed"
                          : "bg-violet-600/80 text-white active:bg-violet-500"
                      }`}
                    >
                      #{num}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setPickerPage((p) => Math.max(1, p - 1))}
                  disabled={pickerSafePage <= 1}
                  className="p-2 rounded-xl text-white/80 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="上一页"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-white/80 text-sm min-w-[4rem] text-center">
                  {pickerSafePage} / {pickerTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPickerPage((p) => Math.min(pickerTotalPages, p + 1))}
                  disabled={pickerSafePage >= pickerTotalPages}
                  className="p-2 rounded-xl text-white/80 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="下一页"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMobilePickerOpen(false)}
                className="text-white/70 text-sm"
              >
                取消
              </button>
            </>
          ) : (
            <>
              <p className="text-white font-medium mb-2">已开启 #{selectedBoxId + 1}</p>
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden shadow-lg bg-transparent mb-2">
                <Image
                  src="/revealed-token.png"
                  alt="Revealed"
                  width={96}
                  height={96}
                  className="object-contain w-full h-full"
                />
              </div>
              <p className="text-white font-semibold mb-2">{(selectedBoxId % 10) + 1} HSK</p>
              <a
                href="#my"
                className="inline-flex items-center gap-1 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors mb-6"
              >
                View in My
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <button
                type="button"
                onClick={() => {
                  setMobilePickerOpen(false);
                  setSelectedBoxId(null);
                }}
                className="px-6 py-3 rounded-2xl bg-violet-600 text-white font-medium text-sm"
              >
                完成
              </button>
            </>
          )}
        </div>
      )}

      {/* 网页端：每页 8 个，4 列 x 2 行，支持筛选未开启 */}
      <div className="hidden md:block">
        {pageBoxes.length === 0 ? (
          <p className="text-center text-white/50 text-sm py-12">暂无未开启的盲盒</p>
        ) : (
          <div className="grid grid-cols-4 grid-rows-2 gap-6">
            {pageBoxes.map((box) => (
              <BlindBoxCard
                key={box.id}
                id={box.id}
                title={box.title}
                remaining={box.remaining}
                isOpen={openedIds.has(box.id)}
                onOpen={() => setOpenedIds((prev) => new Set(prev).add(box.id))}
                sold={SOLD_BOX_IDS.has(box.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
