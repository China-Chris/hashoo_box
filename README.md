# Hashoo Box — Mystery Blind Box (Full Stack)

Blind box dApp on **HashKey Chain**: browse boxes, **open on-chain** with EIP-712 + ZK proof, optional **Vault airdrop (HSK)**, and **My** page for records + on-chain proof summaries.

**Live:** [hashoobox.vercel.app](https://hashoobox.vercel.app/)

**Repo layout:** `frontend/` (Next.js) · `backend/` (Fastify API) · `event-contracts/` (Foundry + ZK)

---

## What you get

| Area | Description |
|------|-------------|
| **Mystery Box** | Grid + pagination (All / Unopened); mobile picker. With `NEXT_PUBLIC_API_URL` set, list comes from backend; open flow uses **Confirm open** modal → wallet sign → submit. |
| **Open success** | Same modal shows **Hashoo #&lt;id&gt;**, **`revealed-token.png`** coin, **+N HSK** when Vault paid, and **View in My** → `/my`. |
| **My** | Opens per wallet, HSK amounts, tx links, collapsible on-chain proof (chain `getOpen` via backend). |
| **Wallet** | RainbowKit + wagmi, HashKey testnet/mainnet in `frontend/app/config/wagmi.ts`. |

Without `NEXT_PUBLIC_API_URL`, the frontend falls back to local demo boxes (no real chain open).

---

## Architecture

```
┌─────────────┐     GET /boxes, GET open-typed-data, POST /open      ┌──────────────┐
│  Next.js    │ ───────────────────────────────────────────────────► │ Fastify API  │
│  (frontend/)│     CORS from browser (localhost:3000 → :3001)        │  backend/    │
└─────────────┘                                                       └──────┬───────┘
       │                                                                     │
       │ signTypedData + POST open                                          │ viem
       ▼                                                                     ▼
┌─────────────┐                                                       ┌──────────────┐
│   Wallet    │                                                       │ BlindBoxZK   │
│  HashKey    │                                                       │ + Vault      │
└─────────────┘                                                       └──────────────┘
```

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind 4, wagmi/viem, RainbowKit — all under **`frontend/`**.
- **Backend:** Fastify, viem, snarkjs prover, Postgres — **`backend/`**.
- **Contracts:** **`event-contracts/`** — BlindBoxZK + Vault; ZK verifier must match real circuit (`commit_open_final.zkey`).

---

## Repo layout

| Path | Purpose |
|------|--------|
| **`frontend/`** | Next app: `app/page.tsx`, `app/my/page.tsx`, components, `public/revealed-token.png`, `package.json` |
| **`backend/`** | API server, DB, EIP-712, chain calls, prover |
| **`backend/docker-compose.yml`** | Postgres on host port **5433** |
| **`backend/scripts/postgres-up-and-seed.sh`** | Compose up + migrate + seed boxes |
| **`event-contracts/`** | Solidity + Foundry; submodule `lib/forge-std` |
| **`scripts/start-all.sh`** | Postgres + backend + frontend dev (uses `frontend/` for Next) |

---

## Prerequisites

- **Node.js 18+** and **pnpm** / npm
- **Docker** (Postgres)
- **Foundry** (optional, for `event-contracts/`)

---

## Frontend (Next.js) — `frontend/`

```bash
cd hashoo_box/frontend
npm install
cp .env.example .env.local
# Edit .env.local — WalletConnect ID; NEXT_PUBLIC_API_URL=http://localhost:3001 for real open
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Frontend env (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Recommended | [WalletConnect Cloud](https://cloud.walletconnect.com/) |
| `NEXT_PUBLIC_API_URL` | For chain open | Backend base URL, e.g. `http://localhost:3001` |

### Build

```bash
cd frontend
npm run build
npm run start
```

### Vercel

- **Root Directory:** `frontend`
- **Build command:** `npm run build` (or `pnpm run build`)
- Set the same env vars in Vercel project settings

---

## Backend — `backend/`

Same as before: `GET /health`, `GET /boxes`, `POST /boxes/:id/open`, `GET /me/opens`, etc. See `backend/docs/FRONTEND_API.md`.

```bash
cd backend
cp .env.example .env   # if present; else create with OPERATOR_PRIVATE_KEY, BLIND_BOX_ADDRESS, …
docker compose up -d postgres   # port 5433
npm install && npm run dev
```

Point **`frontend`** `NEXT_PUBLIC_API_URL=http://localhost:3001`.

---

## One-shot dev (all three)

```bash
bash scripts/start-all.sh
```

Starts Postgres (5433), backend (3001), then Next from **`frontend/`** (3000).

---

## Contracts & ZK

- Deploy under `event-contracts/`; use **real ZK** deploy so verifier matches `commit_open_final.zkey`.
- Fund **Vault** for HSK airdrops when using `OPEN_REWARD_WEI` or per-box rewards.

---

## License

Private / as per repository.
