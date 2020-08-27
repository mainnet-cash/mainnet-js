
const merge = require("deepmerge");


var packageJson = require('./package.json');

const baseConfig = {
  entry: "./src/index.ts",
  mode: "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader"
      }
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".wasm"],
  },
  devtool: "source-map",
  output: {
    library: "mainnet",
  }
};

const nodeConfig = {
  target: "node",
  output: {
    filename: `mainnet-node-${packageJson.version}.js`,
    path: __dirname + "/dist",
  },
};

const browserConfig = {
  target: "web",
  output: {
    filename: `mainnet-${packageJson.version}.js`,
    path: __dirname + "/dist",
    libraryTarget: 'umd',
    library: 'mainnet'
  },
  resolve: {
    alias: {
      assert: false,
      child_process: false,
      crypto: false,
      fs: false,
      "grpc-bchrpc-node": "grpc-bchrpc-browser",
      os: false,
      path: false,
      stream: false,
      util: false,
      url: false,
    },
  },
};

const webWorkerConfig = {
  target: "webworker",
  output: {
    filename: `mainnet-webworker-${packageJson.version}.js`,
    path: __dirname + "/dist",
    libraryTarget: 'umd',
    library: 'mainnet'
  },
  resolve: {
    alias: {
      assert: false,
      child_process: false,
      crypto: false,
      fs: false,
      "grpc-bchrpc-node": "grpc-bchrpc-browser",
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
  browserConfig,
  webWorkerConfig
].map((c) => merge(baseConfig, c));
