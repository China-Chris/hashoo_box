# 重新部署后自测清单

## 本次部署（133）

| 合约 | 地址 |
|------|------|
| BlindBoxZK | `0x929Eb70FD316b85f650F6C15591F6a53106615A2` |
| Vault | `0x589B283B2DFdD4A4CF0B5B976C6Eb4a3f52dAa21` |

`backend/.env` 已更新 `BLIND_BOX_ADDRESS` / `VAULT_ADDRESS`；后端已按新地址重启。

## 已登记测试盒（随机 amount 1–10）

- **boxId 4001–4005** 已在 DB + 链上 `registerBox`，开盒后会按 **amount 枚 HSK** airdrop（需 Vault 有余额）。

## 你要做的验证步骤

1. **给新 Vault 充 HSK**（否则 airdrop 会 revert，开盒仍成功但 My 无 rewardWei）  
   ```bash
   cast send 0x589B283B2DFdD4A4CF0B5B976C6Eb4a3f52dAa21 --value 10ether --rpc-url https://testnet.hsk.xyz --private-key <有余额的私钥>
   ```

2. **前端**  
   - `NEXT_PUBLIC_API_URL=http://localhost:3001`（或你的后端 URL）  
   - 开盒时用 **链上 boxId**：`4001`…`4005`（不是旧 1001 或 0xe364 那套）。

3. **后端**  
   ```bash
   cd backend && npm run dev
   ```
   已跑则无需再启。

4. **开盒**  
   - 连接钱包 → 选盒 **4001**（或 4002…）→ 签名 → 提交。  
   - 成功后查 My 页应显示 **x HSK**；Explorer 可看 Vault `Airdropped` 事件。

5. **再登记更多盒**  
   ```bash
   cd backend && BASE_BOX_ID=4010 COUNT=10 node scripts/register-boxes-random-amount.mjs
   ```

广播记录：`event-contracts/broadcast/DeployHashKeyTestnetOneKeyRealZK.s.sol/133/run-latest.json`

## submitOpen 报 replacement transaction underpriced

同一 operator 地址若有一笔 **pending** 未上链，再发同 nonce 的交易且 gas 不够高就会报这个。  
后端已在 `chain.ts` 里对 `registerBox` / `submitOpen` / `airdrop` **自动抬高 maxFeePerGas / maxPriorityFeePerGas**，并在 underpriced 时再抬一档重试。  
仍失败时：等几分钟让 pending 落块，或到 explorer 看该地址 pending 交易，必要时用更高 gas 加速/取消。
