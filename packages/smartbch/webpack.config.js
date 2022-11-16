const { merge } = require("webpack-merge");
const path = require("path");
const packageJson = require("./package.json");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const { library } = require("webpack");
const __basedir = require("path").resolve(__dirname, "../../");

const baseConfig = {
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
  experiments: { topLevelAwait: true },
};

const prodConfig = {
  mode: "production",
  optimization: {
    minimize: true,
  },
};

const browserConfig = {
  target: "web",
  entry: {
    smartbch: {
      import: "./src/index.ts",
      library: {
        type: "window",
      },
    },
    contract: {
      import: "@mainnet-cash/contract",
      library: {
        type: "window",
      },
    },
    mainnet: {
      import: "mainnet-js",
      library: {
        type: "window",
      },
    },
  },
  output: {
    filename: `[name]-${packageJson.version}.js`,
    path: __dirname + "/dist",
    crossOriginLoading: "anonymous",
  },

  plugins: [
    //new BundleAnalyzerPlugin(),
    new HtmlWebpackPlugin({
      title: "The Empty Mainnet App",
    }),
  ],
  resolve: {
    alias: {
      bip39: require.resolve("../mainnet-js/polyfill/bip39.browser.js"),
      bufferutil: false,
      child_process: false,
      crypto: false,
      dns: false,
      ethers$: require.resolve("ethers/lib/index.js"),
      "@ethersproject/web$": require.resolve("@ethersproject/web/lib/index.js"),
      "@ethersproject/contracts$": require.resolve(
        "@ethersproject/contracts/lib/index.js"
      ),
      eventsource: require.resolve("../mainnet-js/polyfill/eventsource.js"),
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
      solc: require.resolve("./polyfill/solc.js"),
      stream: false,
      tls: false,
      util: require.resolve("../mainnet-js/polyfill/util.js"),
      url: false,
      zlib: false,
    },
  },
};

const browserTestDiff = {
  output: {
    filename: "[name].js",
    path: __basedir + "/jest/playwright/smartbch/",
  },
};

const browserTestConfig = merge(browserConfig, browserTestDiff);

let config = baseConfig;

if (process.env.NODE_ENV == "production") {
  console.log("Running webpack in production mode");
  config = merge(baseConfig, prodConfig);
}

// Join configurations with the base configuration
module.exports = [browserConfig, browserTestConfig].map((c) =>
  merge(config, c)
);
