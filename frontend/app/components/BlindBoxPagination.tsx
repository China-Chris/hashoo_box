"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import BlindBoxCard from "./BlindBoxCard";
import { fetchBoxList, getApiBase } from "../lib/mysterybox-api";
import { useOpenBox } from "../hooks/useOpenBox";
import OpenBoxModal from "./OpenBoxModal";

const PAGE_SIZE = 8; // 每页 8 个，桌面端 4 列 x 2 行
const TOTAL_BOXES = 20; // 无 API 时的占位总数
const SOLD_BOX_IDS = new Set([0, 2, 4, 7]); // 无 API 时演示用已售

type Box = { id: number; title: string; remaining: number };

/** 后端 boxId 可能是大整数字符串；卡片用 number 时用 hash 映射仅作演示，优先用 title 显示真实 boxId */
function boxIdToDisplayId(boxId: string): number {
  const n = Number(boxId);
  if (Number.isSafeInteger(n) && n >= 0 && n < 1e9) return n;
  let h = 0;
  for (let i = 0; i < boxId.length; i++) h = (h * 31 + boxId.charCodeAt(i)) >>> 0;
  return h % 1e6;
}

export default function BlindBoxPagination({ boxes }: { boxes: Box[] }) {
  const [page, setPage] = useState(1);
  const [openedIds, setOpenedIds] = useState<Set<number>>(new Set());
  /** 来自 GET /boxes 的列表（含 opened），有 API 时优先 */
  const [apiList, setApiList] = useState<
    { boxId: string; opened: boolean; displayId: number }[] | null
  >(null);
  const [filter, setFilter] = useState<"all" | "unopened">("all");
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null);
  const [pickerFilter, setPickerFilter] = useState<"all" | "unopened">("all");
  const [pickerPage, setPickerPage] = useState(1);
  /** 移动端链上开盒成功后的 txHash / 错误 */
  const [pickerTxHash, setPickerTxHash] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  /** 选号后先弹窗再开盒（与桌面卡片一致，方便特效） */
  const [openConfirmBoxId, setOpenConfirmBoxId] = useState<string | null>(null);
  /** 开盒成功后在弹窗内展示结果，点 OK 再关闭 */
  const [pickerSuccessResult, setPickerSuccessResult] = useState<{ txHash: string; rewardWei?: string } | null>(null);
  const [openConfirmDisplayId, setOpenConfirmDisplayId] = useState<number>(0);
  const { openBox, isBusy: pickerOpenBusy, state: pickerOpenState, reset: pickerOpenReset } = useOpenBox();

  const loadList = useCallback(async () => {
    if (!getApiBase()) return;
    const all = await fetchBoxList({ limit: 500, offset: 0 });
    if (!all?.items?.length) {
      setApiList(null);
      return;
    }
    const mapped = all.items.map((item) => ({
      boxId: item.boxId,
      opened: item.opened,
      displayId: boxIdToDisplayId(item.boxId),
    }));
    setApiList(mapped);
    setOpenedIds((prev) => {
      const next = new Set(prev);
      for (const it of mapped) if (it.opened) next.add(it.displayId);
      return next;
    });
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const usingApi = apiList != null && apiList.length > 0;

  // 有 API：列表来自 DB，筛选 opened=false = 未开
  const boxesFromApi: Box[] | null = useMemo(() => {
    if (!apiList) return null;
    return apiList.map((it) => ({
      id: it.displayId,
      title: `Hashoo#${it.boxId}`,
      remaining: 0,
      _boxId: it.boxId,
      _opened: it.opened,
    })) as Box[];
  }, [apiList]);

  const effectiveBoxes = boxesFromApi ?? boxes;
  const totalBoxesCount = usingApi ? apiList!.length : TOTAL_BOXES;

  // 未开启数量
  const remainingUnopened = usingApi
    ? apiList!.filter((i) => !i.opened).length
    : TOTAL_BOXES - SOLD_BOX_IDS.size - openedIds.size;

  // Unopened：API 模式只显示未开；本地模式排除已售
  const filteredBoxes = useMemo(() => {
    if (usingApi && boxesFromApi) {
      if (filter === "unopened") return boxesFromApi.filter((b) => !(b as Box & { _opened?: boolean })._opened);
      return boxesFromApi;
    }
    return filter === "unopened"
      ? effectiveBoxes.filter((b) => !SOLD_BOX_IDS.has(b.id))
      : effectiveBoxes;
  }, [usingApi, boxesFromApi, filter, effectiveBoxes]);
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

  // 移动端选号弹层：API 模式用 apiList 的 boxId；本地模式 1..TOTAL
  const pickerNumbers = useMemo(() => {
    if (usingApi && apiList) {
      const nums = apiList
        .filter((it) => (pickerFilter === "unopened" ? !it.opened : true))
        .map((it) => it.boxId);
      return nums;
    }
    return pickerFilter === "unopened"
      ? Array.from({ length: TOTAL_BOXES }, (_, i) => i + 1).filter((num) => !SOLD_BOX_IDS.has(num - 1))
      : Array.from({ length: TOTAL_BOXES }, (_, i) => i + 1);
  }, [usingApi, apiList, pickerFilter]);
  const pickerTotalPages = Math.max(1, Math.ceil(pickerNumbers.length / PAGE_SIZE));
  const pickerSafePage = Math.min(pickerPage, pickerTotalPages);
  const pickerPageNumbers = pickerNumbers.slice(
    (pickerSafePage - 1) * PAGE_SIZE,
    pickerSafePage * PAGE_SIZE
  );

  const isPickerEntrySold = (entry: string | number) => {
    if (usingApi && apiList) {
      const it = apiList.find((x) => x.boxId === String(entry));
      return it?.opened ?? false;
    }
    const id = typeof entry === "number" ? entry - 1 : Number(entry) - 1;
    return SOLD_BOX_IDS.has(id);
  };

  const openMobilePicker = () => {
    setPickerPage(1);
    setPickerTxHash(null);
    setPickerError(null);
    pickerOpenReset();
    // 有 API 且还有未开盒时，默认进 Unopened，避免第一页全是已开导致「一点进去全不能点」
    if (usingApi && remainingUnopened > 0) setPickerFilter("unopened");
    else setPickerFilter("all");
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

      {/* 移动端：只显示第 1 个，Open 弹出选号列表；isOpen 勿绑 first box 否则 6001 已开则整卡变 Opened */}
      <div className="md:hidden">
        <div className="grid grid-cols-1 gap-6">
          {filteredBoxes.length > 0 && (
            <BlindBoxCard
              id={filteredBoxes[0].id}
              title={filteredBoxes[0].title}
              remaining={filteredBoxes[0].remaining}
              mobileTitle="HashooSeries"
              unopenedCount={remainingUnopened}
              totalCount={totalBoxesCount}
              isOpen={false}
              sold={usingApi ? remainingUnopened === 0 : false}
              onOpen={() => {}}
              onOpenClick={remainingUnopened > 0 || !usingApi ? openMobilePicker : undefined}
            />
          )}
        </div>
      </div>

      {/* 移动端：选择开启几号 - 弹层（含 All/Unopened + 分页） */}
      {mobilePickerOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/90 flex flex-col items-center justify-center p-6 overflow-auto">
          {selectedBoxId === null ? (
            <>
              <p className="text-white font-medium mb-3">Choose which number to open</p>
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
              {pickerError && (
                <p className="text-red-400 text-sm mb-2 text-center max-w-xs">{pickerError}</p>
              )}
              <div className="grid grid-cols-4 gap-3 w-full max-w-xs mb-4">
                {pickerPageNumbers.map((num) => {
                  const isSold = isPickerEntrySold(num);
                  const displayLabel = String(num);
                  const displayId = usingApi && apiList
                    ? apiList.find((x) => x.boxId === String(num))?.displayId ?? 0
                    : Number(num) - 1;
                  const boxIdStr = usingApi ? String(num) : null;
                  return (
                    <button
                      key={displayLabel}
                      type="button"
                      disabled={isSold || (usingApi && pickerOpenBusy)}
                      onClick={() => {
                        if (usingApi && boxIdStr) {
                          setPickerError(null);
                          setOpenConfirmBoxId(boxIdStr);
                          setOpenConfirmDisplayId(displayId);
                          return;
                        }
                        setSelectedBoxId(displayId);
                        setOpenedIds((prev) => new Set(prev).add(displayId));
                      }}
                      className={`h-12 rounded-xl text-sm font-medium transition-colors ${
                        isSold || (usingApi && pickerOpenBusy)
                          ? "bg-white/10 text-white/40 cursor-not-allowed"
                          : "bg-violet-600/80 text-white active:bg-violet-500"
                      }`}
                    >
                      #{displayLabel}
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
                Cancel
              </button>
            </>
          ) : (
            <>
              <p className="text-white font-medium mb-2">
                Opened {usingApi && apiList?.find((x) => x.displayId === selectedBoxId)
                  ? `#${apiList.find((x) => x.displayId === selectedBoxId)!.boxId}`
                  : `#${selectedBoxId != null ? selectedBoxId + 1 : ""}`}
              </p>
              {pickerTxHash && (
                <a
                  href={`https://explorer.hsk.xyz/tx/${pickerTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-400 text-xs mb-2 break-all max-w-xs text-center"
                >
                  Tx: {pickerTxHash.slice(0, 10)}…
                </a>
              )}
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
                href="/my"
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
                Done
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
            {pageBoxes.map((box) => {
              const openedFromApi = (box as Box & { _opened?: boolean })._opened === true;
              const sold = usingApi ? openedFromApi : SOLD_BOX_IDS.has(box.id);
              const chainBoxId = (box as Box & { _boxId?: string })._boxId;
              return (
                <BlindBoxCard
                  key={chainBoxId ?? box.id}
                  id={box.id}
                  title={box.title}
                  remaining={box.remaining}
                  isOpen={openedIds.has(box.id) || openedFromApi}
                  onOpen={() => setOpenedIds((prev) => new Set(prev).add(box.id))}
                  sold={sold}
                  chainBoxId={usingApi ? chainBoxId : undefined}
                  onChainOpenSuccess={loadList}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 移动端选号后：与桌面一致先弹窗再签名开盒 */}
      <OpenBoxModal
        open={Boolean(openConfirmBoxId) || Boolean(pickerSuccessResult)}
        onClose={() => {
          if (!pickerOpenBusy && !pickerSuccessResult) {
            setOpenConfirmBoxId(null);
            pickerOpenReset();
          }
        }}
        boxLabel={openConfirmBoxId ? `Hashoo #${openConfirmBoxId}` : pickerSuccessResult ? `Hashoo #${openConfirmBoxId ?? ""}` : ""}
        onConfirm={async () => {
          if (!openConfirmBoxId) return;
          setPickerError(null);
          const result = await openBox(openConfirmBoxId);
          if ("error" in result) {
            setPickerError(result.error);
            return;
          }
          setPickerSuccessResult({ txHash: result.txHash, rewardWei: result.rewardWei });
        }}
        isBusy={pickerOpenBusy && !pickerSuccessResult}
        successResult={pickerSuccessResult}
        onDismissSuccess={async () => {
          if (pickerSuccessResult) {
            setPickerTxHash(pickerSuccessResult.txHash);
            setSelectedBoxId(openConfirmDisplayId);
            setOpenedIds((prev) => new Set(prev).add(openConfirmDisplayId));
            await loadList();
          }
          setPickerSuccessResult(null);
          setOpenConfirmBoxId(null);
          pickerOpenReset();
        }}
        statusText={
          pickerOpenState.status === "signing"
            ? "Sign in wallet…"
            : pickerOpenState.status === "submitting"
              ? "Submitting…"
              : pickerOpenState.status === "fetching"
                ? "Loading…"
                : undefined
        }
        errorMessage={pickerOpenState.status === "error" ? pickerOpenState.message : pickerError}
      />
    </>
  );
}
