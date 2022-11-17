const { merge } = require("webpack-merge");
const path = require("path");
const packageJson = require("./package.json");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const InjectBodyPlugin = require("inject-body-webpack-plugin").default;
const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const __basedir = require("path").resolve(__dirname, "../../");

const baseConfig = {
  mode: "development",
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
  // entry: {
  //   mainnet: {
  //     import: "./src/index.ts",
  //     // library: {
  //     //   type: "global",
  //     // },
  //   },
  // },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: 'ts-loader',
          options: {
              configFile: "tsconfig.browser.json"
          },
        }],
        exclude: [/node_modules/],
      },
    ],
  },
  output: {
    filename: `[name]-${packageJson.version}.js`,
    path: __dirname + "/dist",
    libraryTarget: "umd",
    library: {
      name: '__mainnetPromise',
      type: 'global',
    },
  },
  plugins: [
    //new BundleAnalyzerPlugin(),
    new HtmlWebpackPlugin({
      title: "The Empty Mainnet App",
    }),
    new InjectBodyPlugin({
      content: '<script>document.addEventListener("DOMContentLoaded", async (event) => Object.assign(globalThis, await __mainnetPromise))</script>'
    }),
  ],
  resolve: {
    alias: {
      ethers$: require.resolve("ethers/lib/index.js"),
      "@ethersproject/web$": require.resolve("@ethersproject/web/lib/index.js"),
      "@ethersproject/contracts$": require.resolve(
        "@ethersproject/contracts/lib/index.js"
      ),
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
      eventsource: require.resolve("./polyfill/eventsource.js"),
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
    filename: `[name].js`,
    path: __basedir + "/jest/playwright/",
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
