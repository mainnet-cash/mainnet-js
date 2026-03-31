import { readFileSync } from "fs";
import { resolve } from "path";
import { createBrowserBuildConfig } from "../../vite.browser.config.base.js";

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "package.json"), "utf-8"),
);
const rootDir = resolve(import.meta.dirname, "../..");
const isTest = process.env.BUILD_TARGET === "test";

const htmlBody = `    <script type="module">
      import * as mainnet from './mainnet.js';
      import * as indexeddb from './indexeddb-storage.js';
      Object.assign(globalThis, mainnet, indexeddb);
    </script>`;

export default createBrowserBuildConfig({
  entry: resolve(import.meta.dirname, "src/index.ts"),
  outDir: isTest
    ? resolve(rootDir, "test/playwright/indexeddb-storage")
    : resolve(import.meta.dirname, "dist"),
  fileName: "indexeddb-storage",
  version: pkg.version,
  htmlBody,
  minify: process.env.NODE_ENV === "production",
  copyFiles: isTest
    ? [
        {
          from: resolve(rootDir, "test/playwright/mainnet.js"),
          to: resolve(rootDir, "test/playwright/indexeddb-storage/mainnet.js"),
        },
      ]
    : undefined,
});
