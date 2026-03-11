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
      // @coinbase/cdp-sdk bundles abitype but import 'abitype/zod' must resolve to full exports
      path.join(root, "node_modules/@coinbase/cdp-sdk/node_modules"),
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
    // cdp-sdk 内 import 'abitype/zod' 在部分解析顺序下 alias 不生效，用 Replacement 强制指向根 abitype
    const abitypeZodPath = path.join(root, "node_modules/abitype/dist/esm/exports/zod.js");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webpack = require("webpack");
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^abitype\/zod$/, abitypeZodPath)
    );
    // MetaMask SDK 可选依赖，浏览器构建不需要 react-native async-storage
    config.resolve.alias["@react-native-async-storage/async-storage"] = path.join(
      root,
      "app/stubs/async-storage.js"
    );
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@metamask\/sdk/ },
      /Can't resolve '@react-native-async-storage\/async-storage'/,
    ];
    return config;
  },
};

export default nextConfig;
