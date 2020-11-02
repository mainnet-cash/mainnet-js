const merge = require("deepmerge");
var packageJson = require("./package.json");

const baseConfig = {
  entry: "./src/index.ts",
  mode: "production",
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
    minimize: true,
    mangleWasmImports: true,
    usedExports: true,
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
      assert: false,
      buffer: false,
      child_process: false,
      crypto: false,
      dns: false,
      fs: false,
      http: false,
      https: false,
      net: false,
      os: false,
      "parse-database-url": false,
      path: false,
      pg: false,
      "pg-native": false,
      stream: false,
      tls: false,
      util: false,
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
      assert: false,
      buffer: false,
      child_process: false,
      crypto: false,
      dns: false,
      fs: false,
      http: false,
      https: false,
      net: false,
      os: false,
      "parse-database-url": false,
      path: false,
      pg: false,
      "pg-native": false,
      stream: false,
      tls: false,
      util: false,
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

// Join configurations with the base configuration
module.exports = [
  nodeConfig,
  browserConfig,
  browserTestConfig,
  webWorkerConfig,
].map((c) => merge(baseConfig, c));
