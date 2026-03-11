# Hashoo Box

HashKey Chain 上的盲盒：前端 Next.js、后端 Fastify（EIP-712 + ZK 开盒 + 可选 Vault 发 HSK）、合约在 Foundry。

**三个目录各跑各的：**

| 目录 | 是什么 | 默认端口 |
|------|--------|----------|
| **`frontend/`** | Next.js 网页 | **3000** |
| **`backend/`** | API + 链上提交 + Prover | **3001** |
| **`event-contracts/`** | Solidity + 部署脚本 | 无（编译/部署时连 RPC） |

Postgres 由 backend 的 docker-compose 起，映射到本机 **5433**（避免和本机 5432 冲突）。

---

## 前置条件

- **Node.js 18+**
- **Docker**（要用 Postgres 时）
- **Foundry**（只搞合约/部署时需要）

克隆后**不要在仓库根目录** `npm install`（根目录没有前端 `package.json`）。前端、后端分别在各自目录里装依赖。

---

## 0. 接手下项目（优先：新部署合约 → 改地址 → 从 1 号盒登记）

**推荐顺序（避免 commitment mismatch、也不用猜上一任占过哪些 id）：**

1. **优先新部署一份 BlindBoxZK**（链上登记表为空，boxId 从 1 开始用即可）  
   - `cd event-contracts`，按你们环境跑部署脚本，例如：  
     `bash scripts/deploy-testnet-133-real-zk.sh`（具体以 `event-contracts/` 与 `backend/docs/` 为准）。
2. **把 `backend/.env` 里的 `BLIND_BOX_ADDRESS` 改成新部署的合约地址**（以及如需同步改 `VAULT_ADDRESS` 等）。
3. **Postgres 可清空重来**（可选）：`cd backend && docker compose down -v && docker compose up -d postgres`，再配好 `DATABASE_URL=...@localhost:5433/...`。
4. **登记盒子从 1 开始** — 新合约上没有任何 boxId 被占过，直接用：
   ```bash
   REGISTER_BATCH=1
   REGISTER_BASE_BOX_ID=1
   REGISTER_COUNT=25              # 或你们需要的数量
   REGISTER_ON_CHAIN=1            # 要可开盒必须 1（DB + 链上同一笔）
   ```
   写在 `backend/.env` 里，然后一条命令起全栈：
   ```bash
   bash scripts/bootstrap.sh
   ```
   或后端已起时只登记：
   ```bash
   bash scripts/register-boxes-from-env.sh
   ```
   手动等价：
   ```bash
   cd backend
   REGISTER_ON_CHAIN=1 BASE_BOX_ID=1 COUNT=25 API=http://127.0.0.1:3001 \
     node scripts/register-boxes-random-amount.mjs
   ```

**若暂时不能新部署、必须沿用旧合约地址**，才需要换**链上未占用**的大号段（如 7001），见 §2.5。

---

### 0.1 仅配置 + 一条命令（已按上面改好 .env 后）

- `cp frontend/.env.example frontend/.env.local`，填 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`、`NEXT_PUBLIC_API_URL=http://localhost:3001`。
- 起全栈：
  ```bash
  bash scripts/bootstrap.sh
  ```
  或已装依赖时：
  ```bash
  bash scripts/start-all.sh
  ```
- 临时覆盖登记参数示例：  
  `BASE_BOX_ID=1 COUNT=10 REGISTER_ON_CHAIN=1 bash scripts/register-boxes-from-env.sh`

---

## 1. 前端 `frontend/`（Next.js）

**只做静态/演示：** 不配后端也能开页面，但是本地假数据，不能真链上开盒。

**要联调开盒：** 先起后端，再配 `NEXT_PUBLIC_API_URL`。

```bash
cd frontend
npm install
cp .env.example .env.local
# 编辑 .env.local：
#   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...   # 钱包 / 扫码需要
#   NEXT_PUBLIC_API_URL=http://localhost:3001   # 真开盒必须
npm run dev
```

- 浏览器：**http://localhost:3000**
- 生产构建：`npm run build` → `npm run start`（仍在 `frontend/` 下执行）

---

## 2. 后端 `backend/`（Fastify）

后端**必须**有 `backend/.env`，至少：

- `OPERATOR_PRIVATE_KEY` — 发 `open` / `registerBox` 的私钥  
- `BLIND_BOX_ADDRESS` — BlindBoxZK 合约地址  

可选：`VAULT_ADDRESS`、`OPEN_REWARD_WEI`、`DATABASE_URL`、ZK 的 `CIRCUIT_*` 或 `MOCK_PROOF=1` 等，见 `backend/.env.example`。

### 2.1 起 Postgres（可选，但列表/My 持久化需要）

```bash
cd backend
docker compose up -d postgres
# 本机连接串（注意端口是 5433）
export DATABASE_URL=postgresql://blindbox:blindbox@localhost:5433/blindbox
```

### 2.2 起 API

```bash
cd backend
cp .env.example .env   # 若还没有 .env
# 编辑 .env 填 OPERATOR_PRIVATE_KEY、BLIND_BOX_ADDRESS 等
npm install
npm run dev
```

- 健康检查：**http://localhost:3001/health**
- 无 Postgres 时也可跑（内存存储，重启丢数据）；有 `DATABASE_URL` 则用 Postgres。

### 2.3 一键起库 + 种子数据（可选）

```bash
cd backend
./scripts/postgres-up-and-seed.sh
```

API 说明见 **`backend/docs/FRONTEND_API.md`**。

### 2.4 登记一批盲盒（DB + 可选链上）

**约定：以后登记盒统一用 Node 脚本**（随机 amount 1–10，commitment 与 commit_open 电路一致，开盒可发 1–10 HSK）：

```bash
cd backend
# 新部署合约后推荐：从 1 开始，DB + 链上一起登记（可开盒）
REGISTER_ON_CHAIN=1 BASE_BOX_ID=1 COUNT=25 API=http://127.0.0.1:3001 \
  node scripts/register-boxes-random-amount.mjs

# 仅写 DB（快；沿用旧合约时不要从 1 开始，见 §2.5）
REGISTER_ON_CHAIN=0 BASE_BOX_ID=7001 COUNT=25 API=http://127.0.0.1:3001 \
  node scripts/register-boxes-random-amount.mjs
```

不要用 `register-new-boxids-on-chain.sh` 做正式档位——那是 commitment=salt、amount=0 联调用法，和随机 HSK 不是同一条路线。

### 2.5 接项目必看：链上 commitment 和 DB 必须一致

开盒时后端会读链上 `getRegisteredCommitment(boxId)`，和 **DB 里该盒的 commitment** 比对；不一致直接 **409：`Commitment mismatch with chain registration`**，无法开盒。

**原因：** 链上 BlindBoxZK 已登记的 `boxId → commitment` **不会**因为你清空 Postgres、重装库或只用 `REGISTER_ON_CHAIN=0` 写 DB 而消失。若 DB 里是后来随机生成的新 commitment，和链上旧登记对不上就会报错。

**其他人接项目优先做法：**

| 优先级 | 做法 |
|--------|------|
| **优先（推荐）** | **新部署 BlindBoxZK** → `backend/.env` 里 **`BLIND_BOX_ADDRESS` 改为新地址** → 用 **`BASE_BOX_ID=1`**（或从 1 连续一段）+ **`REGISTER_ON_CHAIN=1`** 跑 mjs，DB 与链上一致，前端直接 Hashoo #1、#2… |
| **备选** | 必须沿用旧合约时，只能用链上**未占用**的 boxId 段（换大 `BASE_BOX_ID`），且 **`REGISTER_ON_CHAIN=1`** 同一笔登记；不能用旧合约却从 1 开始乱登记，否则 mismatch。 |

**不要：** 只清空库、只跑 `REGISTER_ON_CHAIN=0`，却继续用 6001 等**链上已登记过**的 id 去开盒——一定会 mismatch。

**自检：** `curl -s http://127.0.0.1:3001/boxes/<boxId>/status` 看 `chainCommitment` 与 DB 是否一致；`chainRegistered: false` 且开盒仍失败再查 RPC/合约地址。

---

## 3. 合约 `event-contracts/`（Foundry）

不跑前端/后端也能单独编译、测试、部署。

```bash
cd event-contracts
git submodule update --init --recursive   # 首次拉 forge-std
forge build
# 部署按 script 与 .env，例如：
# bash scripts/deploy-testnet-133-real-zk.sh
```

ZK 要用和链上 verifier 一致的电路（如 `commit_open_final.zkey`），否则链上会 `InvalidProof`。细节见 `event-contracts/` 与 `backend/docs/`。

---

## 4. 一键本地全栈（推荐联调）

在**仓库根目录**执行（会后台起后端 + 前端，终端会 `wait` 占住）：

```bash
bash scripts/start-all.sh
```

脚本会依次：

1. `docker compose` 起 Postgres（5433）  
2. `backend/` 里 `npm run dev`（3001）  
3. `frontend/` 里 `npm run dev`（3000），并带上 `NEXT_PUBLIC_API_URL=http://localhost:3001`  

**前置：** 已配置好 `backend/.env`。前端若未装依赖，脚本会在 `frontend/` 里自动 `npm install`。

---

## 5. 环境变量小结

| 位置 | 文件 | 作用 |
|------|------|------|
| 前端 | `frontend/.env.local` | WalletConnect ID、`NEXT_PUBLIC_API_URL` 指后端 |
| 后端 | `backend/.env` | 私钥、合约地址、RPC、Postgres、ZK 路径等 |

不要把含私钥的 `.env` / `.env.local` 提交进 Git。

---

## 6. 仓库结构（简要）

```
hashoo_box/
├── frontend/
├── backend/
├── event-contracts/
├── scripts/
│   ├── bootstrap.sh              # 装依赖 + Postgres + 后端 + 可选自动登记 + 前端
│   ├── start-all.sh              # 已装依赖时一键起 DB + 后端 + 前端（可选 REGISTER_BATCH）
│   └── register-boxes-from-env.sh # 只跑登记，读 backend/.env 里 REGISTER_*
└── README.md
```

---

## License

Private / as per repository.
