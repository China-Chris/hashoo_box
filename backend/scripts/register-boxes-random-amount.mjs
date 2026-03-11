#!/usr/bin/env node
/**
 * 登记一批盒：amount 在 1..10 随机，commitment = salt + amount (mod r)，与 commit_open 电路一致。
 * 开盒后自动发奖会用 amount×1e18 wei（1–10 HSK），除非单独配了 rewardWei。
 *
 * 用法：
 *   node scripts/register-boxes-random-amount.mjs
 *   BASE_BOX_ID=2001 COUNT=5 API=http://127.0.0.1:3001 node scripts/register-boxes-random-amount.mjs
 *
 * 需后端已启动；链上 register 时 commitment 与 DB 一致。
 */
const R = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617"
);

const API = process.env.API || "http://127.0.0.1:3001";
const BASE = parseInt(process.env.BASE_BOX_ID || "3001", 10);
const COUNT = parseInt(process.env.COUNT || "10", 10);
const ON_CHAIN = process.env.REGISTER_ON_CHAIN !== "0";

function randomAmount() {
  return BigInt(1 + Math.floor(Math.random() * 10));
}

function randomSalt() {
  // 足够大的随机 salt，避免与 amount 简单碰撞
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  let s = 0n;
  for (const b of buf) s = (s << 8n) | BigInt(b);
  return s % (R - 10n) + 1n; // 正且不太大，+amount 不溢出 mod 语义
}

async function main() {
  const health = await fetch(`${API}/health`).then((r) => r.ok).catch(() => false);
  if (!health) {
    console.error("Backend not up:", API);
    process.exit(1);
  }

  for (let i = 0; i < COUNT; i++) {
    const boxId = BASE + i;
    const amount = randomAmount();
    const salt = randomSalt();
    const commitment = (salt + amount) % R;
    const saltHex = "0x" + salt.toString(16);

    const body = {
      boxId: String(boxId),
      commitment: commitment.toString(),
      saltHex,
      amount: amount.toString(),
      registerOnChain: ON_CHAIN,
    };

    const r = await fetch(`${API}/internal/register-box`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("boxId", boxId, "amount", amount.toString(), j);
      continue;
    }
    console.log("boxId", boxId, "amount", amount.toString(), "HSK on open", j.registerTxHash || j.ok);
  }
}

main();
