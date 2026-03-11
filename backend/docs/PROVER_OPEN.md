# 开盒 Prover（真 ZK）

## 已配置

`backend/.env` 里已指向（若你本机路径不同请改）：

- `CIRCUIT_WASM_PATH=.../event-contracts/circuits/build/commit_open_js/commit_open.wasm`
- `CIRCUIT_ZKEY_PATH=.../event-contracts/circuits/build/commit_open_final.zkey`

改完后**必须重启后端** `npm run dev`。

## 若还没有 wasm/zkey

```bash
cd event-contracts/circuits
bash build-real-zk.sh
```

会把 `commit_open.circom` 编成 `build/commit_open_js/commit_open.wasm` 和 `build/commit_open_final.zkey`。

## 合约必须和 zkey 配套

链上 **`BlindBoxZK` 里的 Verifier** 必须是用**同一把** `commit_open_final.zkey` 导出的验证合约（`Groth16Verifier_Real.sol`）。  
若当前 133 上部署的是旧版 `ChallengeVerifier`（和 commit_open 不是一套），`submitOpen` 会 **`InvalidProof()`**（revert selector `0x09bde339`），与 gas/余额无关。

**修复：用 Real ZK 重新部署一套 Box + Vault，并改 backend 地址、重新 registerBox：**

```bash
cd event-contracts/circuits && bash build-real-zk.sh   # 确保 Groth16Verifier_Real.sol 最新
cd .. && source .env
./scripts/deploy-testnet-133-real-zk.sh
# 把输出的 BLIND_BOX_ADDRESS、VAULT_ADDRESS 写入 backend/.env，重启后端
cd ../backend && BASE_BOX_ID=1001 ./scripts/register-new-boxids-on-chain.sh
```

脚本对应 `script/DeployHashKeyTestnetOneKeyRealZK.s.sol`（与 OneKey 相同，仅 Verifier 换成 `ChallengeVerifier_Real`）。

## 登记盒时 commitment 约束

电路要求 **`commitment === salt + amount`（mod r）**。  
DB 里 `boxes.commitment` 与 `salt_hex`、`amount` 必须满足这个关系，否则 prover 会直接抛 `commitment mismatch`（例如 box 登记了 101 但 salt 是 `0x01`、amount=0 时，电路只认 commitment=1）。

**Seed 脚本** `scripts/postgres-up-and-seed.sh` 已改为 `commitment = boxId`、`saltHex = 0x01..0x14`（amount 默认 0），与电路一致。若你之前跑过旧版 seed，请重新执行该脚本（会先 `DELETE` 1..20 再登记），或手动：

```bash
psql "$DATABASE_URL" -c "DELETE FROM boxes WHERE box_id BETWEEN 1 AND 20;"
# 再按脚本里 curl 循环登记，或单个：
curl -X POST http://localhost:3001/internal/register-box \
  -H "Content-Type: application/json" \
  -d '{"boxId":"1","commitment":"1","saltHex":"0x01"}'
```

若 **链上** 已为同一 `boxId` 登记过别的 commitment，合约会 `AlreadyRegistered`，不能覆盖。请 **换一批新 boxId** 再 `registerBox`：

```bash
cd backend
# 后端已启动；操作员已 grant OPERATOR_ROLE
./scripts/register-new-boxids-on-chain.sh
# 或自定义起点与数量：
BASE_BOX_ID=2001 COUNT=10 ./scripts/register-new-boxids-on-chain.sh
```

脚本会对每个盒调用 `POST /internal/register-box`，并带 `registerOnChain: true`，在 DB 写入与链上一致：`commitment = i`、`saltHex = 0x01..`（amount=0）。新盒 boxId 默认为 **1001..1020**，前端开盒时用这些 id 即可。

## Mock 路线（仅 anvil）

链上必须是 **MockVerifier** 且后端 **`MOCK_PROOF=1`**，才会发 `0x` 占位 proof；133 上当前部署是真 Verifier，不能 Mock。
