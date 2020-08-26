const TerserPlugin = require("terser-webpack-plugin");
const path = require("path");
const merge = require("deepmerge");

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
  devtool: "source-map",
  // Seems there may be a bug that prevents wasm from minifying 2020-08
  // optimization: {
  //     minimize: false,
  //     minimizer: [],
  // },
  output: {
    library: "mainnet",
  },
};

const nodeConfig = {
  target: "node",
  output: {
    filename: "mainnet.node.js",
    path: __dirname + "/dist",
  },
};

const webConfig = {
  target: "web",
  output: {
    filename: "mainnet.js",
    path: __dirname + "/dist",
  },
  resolve: {
    alias: {
      assert: false,
      child_process: false,
      crypto: false,
      fs: false,
      os: false,
      path: false,
      stream: false,
      util: false,
      url: false,
    },
  },
};

const workerConfig = {
  target: "webworker",
  output: {
    filename: "mainnet.webworker.js",
    path: __dirname + "/dist",
  },
  resolve: {
    alias: {
      assert: false,
      child_process: false,
      crypto: false,
      fs: false,
      os: false,
      path: false,
      stream: false,
      util: false,
      url: false,
    },
  },
};

module.exports = [
  nodeConfig,
  //webConfig,
  //workerConfig
].map((c) => merge(baseConfig, c));
