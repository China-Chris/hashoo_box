import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "engine.io-client": path.join(process.cwd(), "app/stubs/engine-io-client.js"),
    },
  },
  webpack: (config) => {
    const root = process.cwd();
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.modules = [
      path.join(root, "node_modules"),
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
    // Ensure abitype resolves (required by ox/viem ENS); use ox's nested copy
    config.resolve.alias["abitype"] = path.join(
      root,
      "node_modules/ox/node_modules/abitype/dist/esm/exports/index.js"
    );
    return config;
  },
};

export default nextConfig;
