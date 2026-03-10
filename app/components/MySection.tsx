"use client";

import { useState } from "react";
import Image from "next/image";

type RecordStatus = "pending" | "claimed";

type OpenRecord = {
  id: string;
  boxNumber: number;
  amount: number;
  status: RecordStatus;
};

type ProofStatus = "pending" | "confirmed";

type Proof = {
  id: string;
  recordId: string;
  boxNumber: number;
  amount: number;
  status: ProofStatus;
};

// Mock data: 后续从后端接口获取
const MOCK_RECORDS: OpenRecord[] = [
  { id: "1", boxNumber: 10, amount: 7, status: "pending" },
  { id: "2", boxNumber: 15, amount: 3, status: "claimed" },
  { id: "3", boxNumber: 6, amount: 9, status: "pending" },
];

// 已 claim 的记录会有一条 proof，mock 一条与 id "2" 对应
const MOCK_PROOFS: Proof[] = [
  { id: "p1", recordId: "2", boxNumber: 15, amount: 3, status: "confirmed" },
];

export default function MySection() {
  const [records, setRecords] = useState<OpenRecord[]>(MOCK_RECORDS);
  const [proofs, setProofs] = useState<Proof[]>(MOCK_PROOFS);

  const handleClaim = (id: string) => {
    const record = records.find((r) => r.id === id);
    if (!record || record.status === "claimed") return;
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "claimed" as RecordStatus } : r))
    );
    // Claim 后生成一条 proof（实际由后端上链返回）
    setProofs((prev) => [
      ...prev,
      {
        id: `p-${id}-${Date.now()}`,
        recordId: id,
        boxNumber: record.boxNumber,
        amount: record.amount,
        status: "pending" as ProofStatus,
      },
    ]);
    // TODO: 调用后端领取接口，返回 proof 后更新 proofs
  };

  return (
    <section className="pt-8 pb-20 md:pt-10">
      <div className="max-w-3xl">
        <h2 className="text-2xl md:text-3xl font-bold text-white font-display mb-1">My</h2>
        <p className="text-white/60 text-sm font-nav mb-10">
          Claim prizes from your opened blind boxes and generate on-chain proofs.
        </p>

        {/* 抽盲盒记录 */}
        <div className="mb-12">
          <h3 className="text-lg font-semibold text-white font-nav mb-4">Opening records</h3>
          <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 overflow-hidden">
            {records.length === 0 ? (
              <div className="py-12 text-center text-white/50 text-sm font-nav">
                No opening records yet. Open a blind box first.
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {records.map((r) => (
                  <li
                    key={r.id}
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
                      <div>
                        <p className="font-medium text-white font-nav">Hashoo#{r.boxNumber}</p>
                        <p className="text-sm text-white/70 font-nav">{r.amount} HSK</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg font-nav ${
                          r.status === "claimed"
                            ? "bg-white/10 text-white/60"
                            : "bg-violet-500/20 text-violet-300"
                        }`}
                      >
                        {r.status === "claimed" ? "Claimed" : "Pending"}
                      </span>
                      {r.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleClaim(r.id)}
                          className="px-4 py-2 rounded-xl text-sm font-medium font-nav bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 transition-all"
                        >
                          Claim
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 链上证明：展示 claim 后产生的 proof */}
        <div>
          <h3 className="text-lg font-semibold text-white font-nav mb-4">On-chain proof</h3>
          <p className="text-white/60 text-sm font-nav mb-4">
            Each claimed prize has an on-chain proof for verification.
          </p>
          <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 overflow-hidden">
            {proofs.length === 0 ? (
              <div className="py-12 text-center text-white/50 text-sm font-nav">
                No proofs yet. Claim a prize to generate an on-chain proof.
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {proofs.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-4 px-4 py-4 md:px-5 md:py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 flex items-center justify-center">
                        <Image
                          src="/revealed-token.png"
                          alt=""
                          width={40}
                          height={40}
                          className="object-contain w-6 h-6"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-white font-nav">Hashoo#{p.boxNumber}</p>
                        <p className="text-sm text-white/70 font-nav">{p.amount} HSK</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-lg font-nav ${
                        p.status === "confirmed"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {p.status === "confirmed" ? "Confirmed" : "Pending"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
