import type { NextConfig } from "next";
import path from "path";

const root = process.cwd();

const nextConfig: NextConfig = {
  // 多 lockfile 时把 Turbopack 根固定在本仓库，避免从上级目录解析 node_modules 失败
  turbopack: {
    root,
    resolveAlias: {
      "engine.io-client": "./app/stubs/engine-io-client.js",
      // viem 内联 import 'abitype'，Turbopack 需显式别名到本仓库 node_modules
      abitype: "./node_modules/abitype/dist/esm/exports/index.js",
    },
  },
  webpack: (config) => {
    config.resolve.alias = config.resolve.alias || {};
    // 必须包含各包自己的 node_modules，否则 ox 内 import 'abitype' 只搜根 node_modules 会失败
    config.resolve.modules = [
      path.join(root, "node_modules"),
      path.join(root, "node_modules/ox/node_modules"),
      path.join(root, "node_modules/viem/node_modules"),
      ...(Array.isArray(config.resolve.modules) ? config.resolve.modules : ["node_modules"]),
    ];
    // Stub missing createBaseAccountSDK.js in @base-org/account (Base/Coinbase SDK)
    config.resolve.alias[
      path.join(
        root,
        "node_modules/@base-org/account/dist/interface/builder/core/createBaseAccountSDK.js"
      )
    ] = path.join(root, "app/stubs/createBaseAccountSDK.js");
    // Stub missing vanilla-extract functionSerializer (browser + esm)
    const veStubBrowser = path.join(
      root,
      "app/stubs/vanilla-extract-css-functionSerializer.browser.esm.js"
    );
    const veStubEsm = path.join(
      root,
      "app/stubs/vanilla-extract-css-functionSerializer.esm.js"
    );
    config.resolve.alias[
      path.join(
        root,
        "node_modules/@vanilla-extract/css/functionSerializer/dist/vanilla-extract-css-functionSerializer.browser.esm.js"
      )
    ] = veStubBrowser;
    config.resolve.alias[
      path.join(
        root,
        "node_modules/@vanilla-extract/css/functionSerializer/dist/vanilla-extract-css-functionSerializer.esm.js"
      )
    ] = veStubEsm;
    // Stub missing @wagmi/core utils/cookie.js
    config.resolve.alias[
      path.join(root, "node_modules/@wagmi/core/dist/esm/utils/cookie.js")
    ] = path.join(root, "app/stubs/wagmi-cookie.js");
    // Stub engine.io-client (pulled in by MetaMask SDK / socket.io-client)
    config.resolve.alias["engine.io-client"] = path.join(
      root,
      "app/stubs/engine-io-client.js"
    );
    // Ensure abitype resolves（alias 在部分 Next 链路里对 ox 内 import 不生效，用 Replacement 强制指向）
    const abitypeEsm = path.join(root, "node_modules/abitype/dist/esm/exports/index.js");
    config.resolve.alias["abitype"] = abitypeEsm;
    config.resolve.alias["abitype/abis"] = path.join(
      root,
      "node_modules/abitype/dist/esm/exports/abis.js"
    );
    config.resolve.alias["abitype/zod"] = path.join(
      root,
      "node_modules/abitype/dist/esm/exports/zod.js"
    );
    // abitype 已 reinstall 完整后通常只需 alias；若仍解析失败可恢复 ReplacementPlugin
    return config;
  },
};

export default nextConfig;
