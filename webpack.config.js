const { merge } = require("webpack-merge");
const packageJson = require("./package.json");
const NpmDtsPlugin = require("npm-dts-webpack-plugin");

const baseConfig = {
  entry: "./src/index.ts",
  mode: "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".wasm"],
  },
  optimization: {
    minimize: false,
    mangleWasmImports: true,
    usedExports: true,
  },
};

const prodConfig = {
  mode: "production",
  optimization: {
    minimize: true,
  },
};

const nodeConfig = {
  target: "node",
  output: {
    filename: `mainnet-node-${packageJson.version}.js`,
    path: __dirname + "/dist",
    libraryTarget: "umd",
    library: "mainnet",
  },
  plugins: [
    new NpmDtsPlugin({
      entry: "src/index.d.ts",
      output: "dist/index.d.ts",
    }),
  ],
  resolve: {
    alias: {
      ethers$: require.resolve("ethers/lib/index.js"),
      "@ethersproject/web$": require.resolve("@ethersproject/web/lib/index.js"),
      "@ethersproject/contracts$": require.resolve("@ethersproject/contracts/lib/index.js"),
      // "@ethersproject/providers$": require.resolve("@ethersproject/providers/lib/index.js"),
      // "@ethersproject/wallet$": require.resolve("@ethersproject/wallet/lib/index.js"),
      // "@ethersproject/bytes$": require.resolve("@ethersproject/bytes/lib/index.js"),
      // "@ethersproject/transactions$": require.resolve("@ethersproject/transactions/lib/index.js"),
      // "@ethersproject/logger$": require.resolve("@ethersproject/logger/lib/index.js"),
    },
  },
};

const browserConfig = {
  target: "web",
  output: {
    filename: `mainnet-${packageJson.version}.js`,
    path: __dirname + "/dist",
    libraryTarget: "umd",
  },
  resolve: {
    alias: {
      bip39: require.resolve("./polyfill/bip39.browser.js"),
      bufferutil: false,
      child_process: false,
      crypto: false,
      dns: false,
      events: require.resolve("events/"),
      fs: false,
      http: false,
      https: false,
      libpq: false,
      module: false,
      net: false,
      os: false,
      "parse-database-url": false,
      path: false,
      pg: false,
      "pg-format": false,
      "pg-native": false,
      solc: false,
      tls: false,
      util: require.resolve("./polyfill/util.js"),
      url: false,
      zlib: false,
    },
    fallback: {
      stream: require.resolve("stream-browserify"),
    },
  },
};

const webWorkerConfig = {
  target: "webworker",
  output: {
    filename: `mainnet-webworker-${packageJson.version}.js`,
    path: __dirname + "/dist",
    libraryTarget: "umd",
  },
  resolve: {
    alias: {
      bip39: require.resolve("./polyfill/bip39.browser.js"),
      bufferutil: false,
      child_process: false,
      crypto: false,
      dns: false,
      events: require.resolve("events/"),
      fs: false,
      http: false,
      https: false,
      libpq: false,
      module: false,
      net: false,
      os: false,
      "parse-database-url": false,
      path: false,
      pg: false,
      "pg-format": false,
      "pg-native": false,
      solc: false,
      tls: false,
      util: require.resolve("./polyfill/util.js"),
      url: false,
      zlib: false,
    },
    fallback: {
      stream: require.resolve("stream-browserify"),
    },
  },
};

const browserTestDiff = {
  output: {
    filename: `mainnet.js`,
    path: __dirname + "/jest/playwright",
  },
};

const browserTestConfig = merge(browserConfig, browserTestDiff);

let config = baseConfig;

if (process.env.NODE_ENV == "production") {
  console.log("Running webpack in production mode");
  config = merge(baseConfig, prodConfig);
}

// Join configurations with the base configuration
module.exports = [
  nodeConfig,
  browserConfig,
  browserTestConfig,
  webWorkerConfig,
].map((c) => merge(config, c));
