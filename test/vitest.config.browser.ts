import { playwright } from "@vitest/browser-playwright";
import dotenv from "dotenv";
import path from "path";
import { defineConfig } from "vitest/config";

const root = path.resolve(__dirname, "..");

// Load env vars before define so they're available at config time
dotenv.config({ path: path.resolve(root, ".env.regtest") });
try {
  dotenv.config({ path: path.resolve(root, ".env.testnet") });
} catch (e) {}

export default defineConfig({
  resolve: {
    alias: {
      "@rpckit/websocket/electrum-cash": path.resolve(
        root,
        "node_modules/@rpckit/websocket/dist/electrum-cash/index.js",
      ),
      "@rpckit/fallback/electrum-cash": path.resolve(
        root,
        "node_modules/@rpckit/fallback/dist/electrum-cash/index.js",
      ),
      "#test": path.resolve(__dirname),
      "mainnet-js": path.resolve(
        root,
        "packages/mainnet-js/dist/module/index.js",
      ),
    },
  },
  define: {
    "process.env.PRIVATE_WIF": JSON.stringify(process.env.PRIVATE_WIF || ""),
    "process.env.ALICE_ID": JSON.stringify(process.env.ALICE_ID || ""),
    "process.env.ALICE_TESTNET_ADDRESS": JSON.stringify(
      process.env.ALICE_TESTNET_ADDRESS || "",
    ),
    "process.env.ALICE_TESTNET_WALLET_ID": JSON.stringify(
      process.env.ALICE_TESTNET_WALLET_ID || "",
    ),
    "process.env.ELECTRUM_REGTEST": JSON.stringify(
      process.env.ELECTRUM_REGTEST || "",
    ),
  },
  test: {
    root,
    globals: true,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      screenshotDirectory: path.resolve(__dirname, "screenshots"),
    },
    include: ["packages/*/src/**/*.test.browser.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    globalSetup: [path.resolve(__dirname, "vitest.global-setup.cjs")],
    attachmentsDir: path.resolve(__dirname, "attachments"),
    fileParallelism: false,
    testTimeout: 95000,
  },
});
