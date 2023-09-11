const { merge } = require("webpack-merge");
const path = require("path");
const packageJson = require("./package.json");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const InjectBodyPlugin = require("inject-body-webpack-plugin").default;
const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const __basedir = require("path").resolve(__dirname, "../../");
const CircularDependencyPlugin = require("circular-dependency-plugin");
const webpack = require("webpack");

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
    contract: {
      import: "./src/index.web.ts",
      library: {
        name: "__contractPromise",
        type: "global",
      },
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
      content:
        '<script>document.addEventListener("DOMContentLoaded", async (event) => Object.assign(globalThis, await __contractPromise))</script>',
    }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.DefinePlugin({
      "process.env.NODE_DEBUG": JSON.stringify(process.env.NODE_DEBUG),
    }),
    new CircularDependencyPlugin({
      include: /src/,
      // exclude detection of files based on a RegExp
      exclude: /node_modules|mainnet-js/,
      // add errors to webpack instead of warnings
      failOnError: false,
      // allow import cycles that include an asyncronous import,
      // e.g. via import(/* webpackMode: "weak" */ './file.js')
      allowAsyncCycles: false,
      // set the current working directory for displaying module paths
      cwd: process.cwd(),
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /wordlists\/(?!english)/,
      contextRegExp: /bip39/,
    }),
  ],
  resolve: {
    alias: {
      bufferutil: false,
      child_process: false,
      crypto: false,
      dns: false,
      eventsource: false,
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
      stream: require.resolve("stream-browserify"),
      tls: false,
      url: false,
      util: require.resolve("util"),
      zlib: false,
      [path.resolve(__dirname, '../mainnet-js/dist/module/webhook/index.ts')]: false,
      [path.resolve(__dirname, '../mainnet-js/dist/module/webhook/interface.ts')]: false,
      [path.resolve(__dirname, '../mainnet-js/dist/module/webhook/Webhook.ts')]: false,
      [path.resolve(__dirname, '../mainnet-js/dist/module/webhook/WebhookBch.ts')]: false,
      [path.resolve(__dirname, '../mainnet-js/dist/module/webhook/WebhookWorker.ts')]: false,
      [path.resolve(__dirname, '../mainnet-js/dist/module/db/SqlProvider.ts')]: false,
    },
    fallback: {
      stream: require.resolve("stream-browserify"),
    },
  },
};

const browserTestDiff = {
  output: {
    filename: "[name].js",
    path: __basedir + "/jest/playwright/contract/",
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
