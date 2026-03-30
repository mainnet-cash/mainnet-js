import { defineConfig } from "vitest/config";
import path from "path";

const root = path.resolve(__dirname, "..");

export default defineConfig({
  resolve: {
    alias: {
      "@rpckit/websocket/electrum-cash": path.resolve(
        root,
        "node_modules/@rpckit/websocket/dist/electrum-cash/index.js"
      ),
      "@rpckit/fallback/electrum-cash": path.resolve(
        root,
        "node_modules/@rpckit/fallback/dist/electrum-cash/index.js"
      ),
      "#test": path.resolve(__dirname),
    },
  },
  test: {
    root,
    globals: true,
    environment: "node",
    include: [
      "packages/mainnet-js/src/**/*.test.ts",
      "packages/indexeddb-storage/src/**/*.test.ts",
      "packages/postgresql-storage/src/**/*.test.ts",
      "packages/bcmr/src/**/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.test.browser.ts",
      "**/packages/mainnet-cash/**",
    ],
    setupFiles: ["fake-indexeddb/auto", "node-localstorage/register"],
    globalSetup: [path.resolve(__dirname, "vitest.global-setup.cjs")],
    attachmentsDir: path.resolve(__dirname, "attachments"),
    testTimeout: 125000,
    fileParallelism: false,
    coverage: {
      enabled: process.env.COVERAGE === "true",
      provider: "v8",
      reporter: ["lcov", "text"],
      include: [
        "packages/mainnet-js/src/**/*.ts",
        "packages/indexeddb-storage/src/**/*.ts",
        "packages/postgresql-storage/src/**/*.ts",
        "packages/bcmr/src/**/*.ts",
      ],
      exclude: ["**/*.d.ts", "**/*.test.ts", "**/*.test.browser.ts"],
    },
  },
});
