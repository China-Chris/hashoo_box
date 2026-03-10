# Discovery Hashoo — Mystery Box

A blind box (mystery box) showcase web app. Connect a wallet on **HashKey Chain**, open boxes to reveal rewards, and manage your records and on-chain proofs in **My**.

**Live:** [https://hashoobox.vercel.app/](https://hashoobox.vercel.app/)

---

## Features

- **Mystery Box** — Browse and open blind boxes; desktop has grid + pagination (All / Unopened), mobile has a single card and number picker.
- **My** — View opening records, claim prizes, and see on-chain proofs (frontend-only demo).
- **Wallet** — [RainbowKit](https://www.rainbowkit.com/) + [wagmi](https://wagmi.sh/) on **HashKey Chain** only. Open and My require a connected HashKey wallet; otherwise the app prompts to connect.
- **Responsive** — Layout and navigation adapt for mobile and desktop.

---

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [RainbowKit](https://www.rainbowkit.com/) + [wagmi](https://wagmi.sh/) + [viem](https://viem.sh/) for wallet and HashKey Chain

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm

### Install & run

```bash
git clone <repo-url>
cd hashoo_box
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID for mobile / WalletConnect flows. Get one at [WalletConnect Cloud](https://cloud.walletconnect.com/). |

Edit `.env.local` and set the value. If missing, the app still runs but WalletConnect may not work.

---

## Build & deploy

### Local build

```bash
npm run build
npm run start
```

If the default (Turbopack) build fails due to wallet-related dependencies, use the webpack build:

```bash
npm run build:webpack
npm run start
```

### Deploy on Vercel

1. Push the repo to GitHub and import the project in [Vercel](https://vercel.com).
2. Add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in **Settings → Environment Variables**.
3. Use the default **Build Command** (`npm run build`). If the build fails, set **Build Command** to `npm run build:webpack`.

The app is configured for [https://hashoobox.vercel.app/](https://hashoobox.vercel.app/).

---

## Project structure (main)

```
app/
  config/wagmi.ts     # HashKey Chain + RainbowKit connectors
  hooks/              # e.g. useRequireHashKeyWallet
  components/         # BlindBoxCard, MySection, ConnectWalletButton, etc.
  page.tsx            # Home (Mystery Box)
  my/page.tsx         # My (records + proofs)
  stubs/              # Stubs for some third-party deps (build compatibility)
```

---

## License

Private / as per repository.
