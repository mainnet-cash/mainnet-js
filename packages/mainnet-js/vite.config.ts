import { createRequire } from "module";
import { resolve } from "path";
import { createBrowserBuildConfig } from "../../vite.browser.config.base.js";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");
const rootDir = resolve(import.meta.dirname, "../..");
const isTest = process.env.BUILD_TARGET === "test";

const htmlBody = `    <script type="module">
      import * as mainnet from './mainnet.js';
      Object.assign(globalThis, mainnet);
    </script>`;

export default createBrowserBuildConfig({
  entry: resolve(import.meta.dirname, "src/index.ts"),
  outDir: isTest
    ? resolve(rootDir, "test/playwright")
    : resolve(import.meta.dirname, "dist"),
  fileName: "mainnet",
  version: pkg.version,
  htmlBody,
  minify: process.env.NODE_ENV === "production",
});
