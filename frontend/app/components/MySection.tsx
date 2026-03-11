"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useAccount } from "wagmi";
import {
  fetchMyOpens,
  fetchChainOpen,
  fetchHealth,
  getApiBase,
  type MyOpenEntry,
  type ChainOpenSummary,
} from "../lib/mysterybox-api";

const EXPLORER_TX = "https://explorer.hsk.xyz/tx/";
const EXPLORER_ADDR = "https://explorer.hsk.xyz/address/";

function formatHsk(weiStr: string): string {
  try {
    const w = BigInt(weiStr);
    const WAD = BigInt(10) ** BigInt(18);
    const whole = w / WAD;
    const frac = w % WAD;
    if (frac === BigInt(0)) return whole.toString();
    const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
    return `${whole}.${fracStr}`;
  } catch {
    return weiStr;
  }
}

export default function MySection() {
  const { address } = useAccount();
  const [items, setItems] = useState<MyOpenEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address || !getApiBase()) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetchMyOpens(address, { limit: 100 });
    setLoading(false);
    if (!res) {
      setError("Failed to load opens (check NEXT_PUBLIC_API_URL & CORS)");
      setItems([]);
      return;
    }
    setItems(res.items);
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  /** 每条开盒记录拉链上 getOpen，给「链上证明」用 */
  const [chainByBoxId, setChainByBoxId] = useState<Record<string, ChainOpenSummary>>({});
  useEffect(() => {
    if (!getApiBase() || items.length === 0) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, ChainOpenSummary> = {};
      for (const r of items) {
        if (!r.txHash) continue;
        const d = await fetchChainOpen(r.boxId);
        if (d && !cancelled) next[r.boxId] = d;
      }
      if (!cancelled) setChainByBoxId(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

  const hasApi = Boolean(getApiBase());

  const [blindBoxAddress, setBlindBoxAddress] = useState<string | null>(null);
  useEffect(() => {
    if (!hasApi) return;
    fetchHealth().then((h) => h?.blindBoxAddress && setBlindBoxAddress(h.blindBoxAddress));
  }, [hasApi]);

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  return (
    <section className="pt-8 pb-20 md:pt-10">
      <div className="max-w-3xl">
        <h2 className="text-2xl md:text-3xl font-bold text-white font-display mb-1">My</h2>
        <p className="text-white/60 text-sm font-nav mb-6">
          Boxes you opened on-chain (signed + operator submitted). Each row links to the open tx.
        </p>

        {!hasApi && (
          <p className="text-amber-400/90 text-sm font-nav mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            Set <code className="text-amber-200">NEXT_PUBLIC_API_URL</code> to your backend to load real
            records.
          </p>
        )}

        {address && hasApi && (
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-medium font-nav bg-white/10 text-white hover:bg-white/15 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            {error && <span className="text-red-400 text-sm">{error}</span>}
          </div>
        )}

        <div className="mb-10">
          <h3 className="text-lg font-semibold text-white font-nav mb-2">Opening records</h3>
          <p className="text-white/45 text-xs font-nav mb-3">
            Showing up to 2 rows; scroll for more.
          </p>
          <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 overflow-hidden">
            {loading && items.length === 0 ? (
              <div className="py-12 text-center text-white/50 text-sm font-nav">Loading…</div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-white/50 text-sm font-nav">
                No opening records yet. Open a blind box from Mystery Box first.
              </div>
            ) : (
              <ul
                className="divide-y divide-white/[0.06] overflow-y-auto overscroll-contain max-h-[280px] [scrollbar-width:thin]"
                style={{
                  scrollbarGutter: "stable",
                }}
              >
                {items.map((r) => (
                  <li
                    key={`${r.boxId}-${r.txHash ?? r.openedAt ?? ""}`}
                    className="flex flex-wrap items-center gap-4 px-4 py-4 md:px-5 md:py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 flex items-center justify-center">
                        <Image
                          src="/revealed-token.png"
                          alt=""
                          width={48}
                          height={48}
                          className="object-contain w-8 h-8"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white font-nav">Hashoo#{r.boxId}</p>
                        <p className="text-sm text-white/70 font-nav">
                          {r.rewardWei != null && r.rewardWei !== "0"
                            ? `${formatHsk(r.rewardWei)} HSK`
                            : r.amount != null
                              ? `${r.amount} (circuit amount; 未写入 opened_reward_wei 时未发链上奖)`
                              : "开盒已成功，但当时未发 HSK：盒子上没有 amount/rewardWei，且未配 OPEN_REWARD_WEI，或 Vault 没余额。新开盒已配 OPEN_REWARD_WEI 会默认发 1 HSK（需 Vault 充值）。"}
                        </p>
                        {r.openedAt && (
                          <p className="text-xs text-white/40 font-nav mt-0.5">
                            {new Date(r.openedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-lg font-nav bg-emerald-500/20 text-emerald-400">
                        Opened on-chain
                      </span>
                      {r.txHash && (
                        <a
                          href={`${EXPLORER_TX}${r.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-violet-400 hover:text-violet-300 font-nav break-all max-w-[200px] text-right"
                        >
                          Tx {r.txHash.slice(0, 10)}…
                        </a>
                      )}
                    </div>
                    {chainByBoxId[r.boxId] && (
                      <div className="w-full basis-full px-4 pb-2 pt-0 md:px-5">
                        <details className="group rounded-xl border border-violet-500/20 bg-violet-950/15 open:bg-violet-950/25">
                          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-violet-300/90 font-nav flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                            <span>On-chain summary (getOpen #{r.boxId})</span>
                            <span className="text-white/40 group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <div className="grid gap-2 text-xs font-mono text-white/85 px-3 pb-3 pt-0 border-t border-white/[0.04]">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-white/45 font-nav shrink-0">commitment</span>
                              <code className="break-all rounded bg-black/40 px-2 py-1">
                                {chainByBoxId[r.boxId].commitment}
                              </code>
                              <button
                                type="button"
                                onClick={() => copy(chainByBoxId[r.boxId].commitment)}
                                className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-nav text-white/80 hover:bg-white/15"
                              >
                                复制
                              </button>
                            </div>
                            <div>
                              <span className="text-white/45 font-nav">proof 字节数 </span>
                              <span>{chainByBoxId[r.boxId].proofLength} bytes</span>
                              <span className="text-white/40 font-nav ml-2">（Groth16 calldata，与 Verifier 校验一致）</span>
                            </div>
                            <div>
                              <span className="text-white/45 font-nav">链上时间 </span>
                              {new Date(Number(chainByBoxId[r.boxId].timestamp) * 1000).toLocaleString()}（unix{" "}
                              {chainByBoxId[r.boxId].timestamp}）
                            </div>
                            <div className="break-all">
                              <span className="text-white/45 font-nav">opener </span>
                              {chainByBoxId[r.boxId].user}
                            </div>
                            {r.txHash && (
                              <a
                                href={`${EXPLORER_TX}${r.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex text-xs font-medium text-violet-400 hover:text-violet-300 font-nav pt-1"
                              >
                                View tx Input Data (proof hex)
                              </a>
                            )}
                          </div>
                        </details>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 链上证明 — 完整说明 + 合约地址 + 校验路径 */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/90 overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4 bg-white/[0.02]">
            <h3 className="text-lg font-semibold text-white font-display">链上证明说明</h3>
            <p className="text-white/55 text-sm font-nav mt-1">
              开盒时 operator 调用 <code className="text-violet-300/90">BlindBoxZK.submitOpen</code>
              ，合约内用 Groth16 Verifier 校验 proof，通过后才写入 opened 状态；proof 与 commitment 永久留在链上，任何人可读。
            </p>
          </div>
          <div className="px-5 py-5 space-y-6">
            {blindBoxAddress && (
              <div>
                <h4 className="text-sm font-semibold text-white font-nav mb-2">当前后端绑定的合约（BlindBoxZK）</h4>
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-black/50 border border-white/[0.06] px-3 py-2">
                  <code className="text-xs font-mono text-emerald-400/95 break-all">{blindBoxAddress}</code>
                  <button
                    type="button"
                    onClick={() => copy(blindBoxAddress)}
                    className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-xs font-nav text-white/85 hover:bg-white/15"
                  >
                    复制地址
                  </button>
                  <a
                    href={`${EXPLORER_ADDR}${blindBoxAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs font-medium text-violet-400 hover:text-violet-300 font-nav"
                  >
                    在 HashKey Explorer 打开合约
                  </a>
                </div>
                <p className="text-white/45 text-xs font-nav mt-2">
                  EIP-712 签名里的 verifyingContract 必须与上述地址一致，否则签名无效。
                </p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-white font-nav mb-2">链上具体存了什么</h4>
              <ul className="list-disc list-inside text-white/65 text-sm font-nav space-y-1.5">
                <li>
                  <strong className="text-white/80">commitment</strong>：电路公开输入，与 registerBox / proof 一致；上表每条记录已展示。
                </li>
                <li>
                  <strong className="text-white/80">proof（bytes）</strong>：abi.encode(pA, pB, pC)，约 256 字节；整段在交易的 Input Data 里，与合约 <code className="text-white/50">getOpen(boxId)</code> 返回的第一项相同。
                </li>
                <li>
                  <strong className="text-white/80">timestamp / user</strong>：开盒区块时间与 opener 地址，与事件 <code className="text-white/50">OpenSubmitted</code> 一致。
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white font-nav mb-2">如何自己核对</h4>
              <ol className="list-decimal list-inside text-white/65 text-sm font-nav space-y-2">
                <li>
                  打开上方任意一笔 <strong className="text-white/80">Tx 链接</strong> → 找到「Input Data」→ 找到对{" "}
                  <code className="text-white/50">submitOpen</code> 的调用，第三参即为 proof 的十六进制。
                </li>
                <li>
                  在 Explorer 合约页选「Read Contract」→ 调用 <code className="text-white/50">getOpen(你的 boxId)</code>
                  ，应得到与页面摘要相同的 commitment、且 proof 长度一致。
                </li>
                <li>
                  Verifier 与电路为同一套 zkey（<code className="text-white/50">commit_open_final.zkey</code>
                  ）；链上校验通过即表示 proof 对该 commitment 有效。
                </li>
              </ol>
            </div>

            {!blindBoxAddress && hasApi && (
              <p className="text-amber-400/80 text-xs font-nav">
                未能从后端 /health 读取 blindBoxAddress，请确认后端已更新并重启。
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
