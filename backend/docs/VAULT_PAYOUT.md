# 开盒后 HSK 显示与 Vault 发放

## 为什么之前看不到「获得了多少 HSK」

1. **`BlindBoxZK.submitOpen` 只验证 ZK 并记录开盒，不会转币。**
2. **HSK 发放走的是 `Vault.airdrop(winner, amount)`**，需要 operator 在开盒成功后主动调。
3. My 页原来展示的 `amount` 是电路里的 witness 字段，登记时多为空，也不是链上转给你的 HSK。

## 现在怎么才有金额

1. **Vault 里要有余额**（原生 HSK 打进 `VAULT_ADDRESS`）。
2. **奖励从哪来（优先级从高到低）**
   - **`rewardWei`**：登记时指定 wei，单盒覆盖下面两项。
   - **`amount` 1–10**：电路 witness 里的 `amount`；未设 `rewardWei` 时，自动按 **`amount × 10^18` wei** 发 HSK（即 1–10 枚 HSK）。  
     登记时必须满足 `commitment = salt + amount (mod r)`，prover 才能过。
   - **`OPEN_REWARD_WEI`**：全局默认 wei；前两项都没有时才用。

3. **amount 随机 1–10 的一批盒**  
   ```bash
   cd backend && node scripts/register-boxes-random-amount.mjs
   # BASE_BOX_ID=3001 COUNT=20 node scripts/register-boxes-random-amount.mjs
   ```  
   脚本会为每盒随机 `amount`∈[1,10]，并算好 `salt`/`commitment` 再 `register-box`（可选链上）。
3. **重启后端**。用户再开盒时，会在 `submitOpen` 成功后自动 `Vault.airdrop(user, prizeWei)`，并把实际发放写入 `opened_reward_wei`，My 页会显示 **「x.xxx HSK」**。

## 已经开过的盒

之前开盒没有走 airdrop，链上没有这笔转账，**无法事后用同一套接口补写「获得了多少」**。若要补发只能 operator 手动 `airdrop` 或 `batchAirdrop`，或以后做单独补发接口。

## 环境变量摘要

| 变量 | 含义 |
|------|------|
| `VAULT_ADDRESS` | 已部署 Vault 合约 |
| `OPEN_REWARD_WEI` | 每开一盒默认发放的 wei；不配则不发 |
| `rewardWei`（register-box） | 单盒覆盖默认 |
