"use client";

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { defineChain } from "viem/chains/utils";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";

/**
 * 前端默认使用测试链 133，与后端 CHAIN_ID / 合约部署一致，EIP-712 开盒才能通过。
 * 主网 177 保留在 chains 里，需要时可手动切换。
 */
export const HASHKEY_CHAIN_ID = 133;

/** 主网链 ID（可选；未作为默认链） */
export const HASHKEY_MAINNET_CHAIN_ID = 177;

// HashKey Testnet — 默认链
const hashkeyTestnet = defineChain({
  id: HASHKEY_CHAIN_ID,
  name: "HashKey Chain Testnet",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet.hsk.xyz"] },
  },
  blockExplorers: {
    default: { name: "HashKey Explorer", url: "https://explorer.hsk.xyz" },
  },
});

// HashKey Mainnet — 次要链
const hashkeyMainnet = defineChain({
  id: HASHKEY_MAINNET_CHAIN_ID,
  name: "HashKey Chain",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.hsk.xyz"] },
  },
  blockExplorers: {
    default: { name: "HashKey Explorer", url: "https://explorer.hsk.xyz" },
  },
});

/**
 * 移动端优先：MetaMask 组放在最前，连接弹窗先看到小狐狸，再 WalletConnect，再浏览器扩展。
 * projectId 必填；桌面若 MetaMask 转圈可改用下面 Browser 里的 injected。
 */
const connectors = connectorsForWallets(
  [
    {
      groupName: "MetaMask",
      wallets: [
        (opts) => metaMaskWallet({ ...opts, projectId }),
        (opts) => walletConnectWallet({ ...opts, projectId }),
      ],
    },
    {
      groupName: "Browser",
      wallets: [injectedWallet],
    },
  ],
  { appName: "Discovery Hashoo", projectId }
);

export const config = createConfig({
  connectors,
  // 133 在前：默认连接/切链到测试网，与后端一致
  chains: [hashkeyTestnet, hashkeyMainnet],
  transports: {
    [hashkeyTestnet.id]: http(),
    [hashkeyMainnet.id]: http(),
  },
  // false 减少 SSR/水合时重复初始化 connector，缓解扩展连接卡住
  ssr: false,
});
