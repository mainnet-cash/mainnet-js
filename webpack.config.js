const merge = require("deepmerge");
const packageJson = require("./package.json");

const baseConfig = {
  entry: "./src/index.ts",
  mode: "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
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
      eventsource: false,
      fs: false,
      http: false,
      https: false,
      libpq: false,
      net: false,
      os: false,
      "parse-database-url": false,
      path: false,
      pg: false,
      "pg-format": false,
      "pg-native": false,
      stream: false,
      tls: false,
      util: require.resolve("./polyfill/util.js"),
      url: false,
      zlib: false,
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
      eventsource: false,
      fs: false,
      http: false,
      https: false,
      libpq: false,
      net: false,
      os: false,
      "parse-database-url": false,
      path: false,
      pg: false,
      "pg-format": false,
      "pg-native": false,
      stream: false,
      tls: false,
      util: require.resolve("./polyfill/util.js"),
      url: false,
      zlib: false,
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
