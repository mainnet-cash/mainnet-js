const { merge } = require("webpack-merge");
const packageJson = require("./package.json");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const InjectBodyPlugin = require("inject-body-webpack-plugin").default;
const CircularDependencyPlugin = require("circular-dependency-plugin");
const __basedir = require("path").resolve(__dirname, "../../");

const path = require("path");
const webpack = require("webpack");

const baseConfig = {
  mode: "development",
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".wasm"],
    extensionAlias: {
      ".js": [".ts", ".js"],
    },
  },
  optimization: {
    minimize: false,
    mangleWasmImports: true,
    usedExports: true,
  },
  experiments: { topLevelAwait: true, outputModule: true },
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
    mainnet: {
      import: "./src/index.ts",
      library: {
        name: "__mainnetPromise",
        type: "global",
      },
    },
  },
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
  output: {
    filename: `[name]-${packageJson.version}.js`,
    path: __dirname + "/dist",
    libraryTarget: "umd",
  },
  plugins: [
    //new BundleAnalyzerPlugin(),
    new HtmlWebpackPlugin({
      title: "The Empty Mainnet App",
    }),
    new InjectBodyPlugin({
      content:
        '<script>document.addEventListener("DOMContentLoaded", async (event) => Object.assign(globalThis, await __mainnetPromise))</script>',
    }),
    new CircularDependencyPlugin({
      include: /src/,
      // exclude detection of files based on a RegExp
      exclude: /node_modules/,
      // add errors to webpack instead of warnings
      failOnError: false,
      // allow import cycles that include an asyncronous import,
      // e.g. via import(/* webpackMode: "weak" */ './file.js')
      allowAsyncCycles: false,
      // set the current working directory for displaying module paths
      cwd: process.cwd(),
    }),
  ],
  resolve: {
    alias: {
      crypto: false,
      child_process: false,
    },
    fallback: {},
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
      crypto: false,
      child_process: false,
    },
    fallback: {},
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
