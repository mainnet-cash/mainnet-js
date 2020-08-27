
const merge = require("deepmerge");

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
    filename: "mainnet.node.js",
    path: __dirname + "/dist",
  },
};

const browserConfig = {
  target: "web",
  output: {
    filename: "mainnet.js",
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
    filename: "mainnet.webworker.js",
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
  //nodeConfig,
  browserConfig,
  webWorkerConfig
].map((c) => merge(baseConfig, c));
