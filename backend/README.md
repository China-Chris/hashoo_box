# BlindBox backend (1A + 2A + 3C)

Node + TypeScript + Fastify + viem. Operator submits `submitOpen` after EIP-712 verify + proving.

## Setup

```bash
cd backend
cp .env.example .env
# Edit .env: OPERATOR_PRIVATE_KEY, BLIND_BOX_ADDRESS (testnet deployed)
npm install
npm run dev
```

## Flow

1. **Register box** (mint/listing): `POST /dev/register-box` with `boxId`, `commitment`, `saltHex` — or replace with your DB.
2. **Typed data**: `GET /boxes/:boxId/open-typed-data?user=0x...` — frontend `signTypedData`.
3. **Open**: `POST /boxes/:boxId/open` with `{ signature, message }` — backend proves + `submitOpen`.

## 1A Proving

Set `CIRCUIT_WASM_PATH` and `CIRCUIT_ZKEY_PATH`, then implement witness + `snarkjs.groth16.fullProve` in `src/prover.ts`.  
Proof bytes must be `abi.encode(pA, pB, pC)` — use `packGroth16Proof(...)` after snarkjs.

## 真 ZK 跑通（Groth16 + 本仓库电路）

1. `event-contracts/circuits/build-real-zk.sh` 生成 wasm + zkey + `Groth16Verifier_Real.sol`
2. `forge script script/DeployRealZK.s.sol` 部署 **ChallengeVerifier_Real + BlindBoxZK**（与测试网旧部署无关）
3. 后端 `MOCK_PROOF=0`，配置 `CIRCUIT_WASM_PATH` / `CIRCUIT_ZKEY_PATH`
4. `commitment` 必须等于 `salt + amount`（mod r），与 `commit_open.circom` 一致

一键（需已装 circom + snarkjs）：

```bash
cd backend && bash scripts/run-real-zk-integration.sh
```

## 合约 + 后端联调（Mock，无 ZK）

使用 **MockVerifier** 在本地 anvil 部署，MOCK_PROOF=1 走通：注册盒 → EIP-712 签名 → submitOpen → isOpened → Vault.airdrop。

```bash
# 需已安装 anvil (foundry) 和 jq
cd backend
npm run test:integration
```

脚本会：启动 anvil → `DeployIntegrationMock` → 给 Vault 充 1 ETH → 跑 `scripts/integration-test.ts`。  
**不要**把 Mock 部署当生产；生产仍用 1A 真 Groth16 + 测试网 BlindBoxZK(ChallengeVerifier)。

## 3C

When you add on-chain register (NFT mint event or `registerBox`), add a small module that sets `chainCommitmentRegisteredAt` on the box record and optionally rejects open if missing.

## Contracts (testnet 133)

- BlindBoxZK: see `event-contracts` deploy output
- Same EIP-712 `verifyingContract` must match `BLIND_BOX_ADDRESS` in `.env`
