"use client";

import Image from "next/image";

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

/**
 * 点 Open → 弹窗 Confirm → 签名/提交 → 成功后在同一弹窗展示结果（中了多少 HSK），再点 OK 关闭。
 */
export default function OpenBoxModal({
  open,
  onClose,
  boxLabel,
  onConfirm,
  isBusy,
  statusText,
  errorMessage,
  /** 开盒成功且未 dismiss 时展示；关闭时由 onDismissSuccess 收尾 */
  successResult,
  onDismissSuccess,
}: {
  open: boolean;
  onClose: () => void;
  boxLabel: string;
  onConfirm: () => void | Promise<void>;
  isBusy: boolean;
  statusText?: string;
  errorMessage?: string | null;
  successResult?: { txHash: string; rewardWei?: string } | null;
  onDismissSuccess?: () => void;
}) {
  if (!open) return null;

  const isSuccess = Boolean(successResult);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="open-box-modal-title"
      onClick={() => !isBusy && !isSuccess && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-violet-500/30 bg-[#0a0a0a] shadow-[0_0_40px_rgba(139,92,246,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {isSuccess && successResult ? (
          <>
            <div className="relative min-h-[220px] flex flex-col items-center justify-center bg-gradient-to-b from-emerald-950/50 to-black/80 px-6 py-10">
              <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/25 via-transparent to-transparent" />
              <p className="text-emerald-400/90 text-sm font-nav font-medium mb-2">Opened on-chain</p>
              <h2 id="open-box-modal-title" className="text-2xl font-bold text-white font-display text-center">
                {boxLabel}
              </h2>
              {/* 与 BlindBoxCard / MySection 同一枚：public/revealed-token.png */}
              {successResult.rewardWei != null && successResult.rewardWei !== "0" && (
                <div className="my-5 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center overflow-hidden shadow-lg bg-transparent">
                    <Image
                      src="/revealed-token.png"
                      alt="HSK"
                      width={80}
                      height={80}
                      className="object-contain w-full h-full"
                    />
                  </div>
                </div>
              )}
              {successResult.rewardWei != null && successResult.rewardWei !== "0" ? (
                <p className="text-3xl font-bold text-white font-display mt-0">
                  +{formatHsk(successResult.rewardWei)} <span className="text-lg text-white/70">HSK</span>
                </p>
              ) : (
                <p className="text-white/60 text-sm font-nav mt-4 text-center max-w-xs">
                  No HSK payout for this box (check My later if Vault airdrop was configured).
                </p>
              )}
              <a
                href="/my"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-400 hover:text-violet-300 font-nav"
              >
                View in My
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
            <div className="p-5 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => onDismissSuccess?.()}
                className="w-full py-3 rounded-2xl text-sm font-medium font-nav bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
              >
                OK
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              className="relative min-h-[180px] flex items-center justify-center bg-gradient-to-b from-violet-950/40 to-black/80"
              data-open-box-effect-slot
            >
              <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent" />
              <div className="relative text-center px-6 py-8">
                <p className="text-white/50 text-xs font-nav uppercase tracking-wider mb-2">Mystery Box</p>
                <h2 id="open-box-modal-title" className="text-2xl font-bold text-white font-display">
                  {boxLabel}
                </h2>
                <p className="text-white/60 text-sm font-nav mt-2">
                  After confirming, your wallet will ask you to sign, then the open is submitted on-chain.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="px-5 pt-2">
                <p className="text-red-400 text-xs font-nav rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 break-words">
                  {errorMessage}
                </p>
              </div>
            )}

            {isBusy && statusText && (
              <div className="px-5 pt-2 flex items-center justify-center gap-2 text-violet-300 text-sm font-nav">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                {statusText}
              </div>
            )}

            <div className="flex gap-3 p-5 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="flex-1 py-3 rounded-2xl text-sm font-medium font-nav bg-white/10 text-white hover:bg-white/15 disabled:opacity-50 disabled:pointer-events-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onConfirm()}
                disabled={isBusy}
                className="flex-1 py-3 rounded-2xl text-sm font-medium font-nav bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isBusy ? (statusText ?? "Processing…") : "Confirm open"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
