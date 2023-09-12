const { merge } = require("webpack-merge");
const packageJson = require("./package.json");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { webpack } = require("webpack");
const InjectBodyPlugin = require("inject-body-webpack-plugin").default;
const __basedir = require("path").resolve(__dirname, "../../");
const fs = require("fs");

fs.mkdirSync(__basedir + "/jest/playwright/indexeddb-storage");
fs.copyFileSync(
  __basedir + "/jest/playwright/mainnet.js",
  __basedir + "/jest/playwright/indexeddb-storage/mainnet.js"
);

const baseConfig = {
  mode: "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.browser.json",
            },
          },
        ],
        exclude: [/node_modules/],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".wasm"],
    extensionAlias: {
      ".js": [".ts", ".js"],
    },
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
    "indexeddb-storage": {
      import: "./src/index.ts",
    },
  },
  output: {
    filename: `[name]-${packageJson.version}.js`,
    path: __dirname + "/dist",
    crossOriginLoading: "anonymous",
    libraryTarget: "umd",
  },
  plugins: [
    //new BundleAnalyzerPlugin(),
    new HtmlWebpackPlugin({
      title: "The Empty Mainnet App",
    }),
    new InjectBodyPlugin({
      content: `<script defer src="mainnet.js"></script><script>document.addEventListener("DOMContentLoaded", async (event) => Object.assign(globalThis, await __mainnetPromise))</script>`,
    }),
  ],
  resolve: {
    alias: {},
    fallback: {},
  },
};

const browserTestDiff = {
  output: {
    filename: "[name].js",
    path: __basedir + "/jest/playwright/indexeddb-storage/",
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
