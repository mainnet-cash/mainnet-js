import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "#test": path.resolve(__dirname, "../../test"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "**/__tests__/**/*.{ts,tsx,js}",
      "**/*.{spec,test}.{ts,tsx,js}",
    ],
    exclude: ["**/node_modules/**", "**/dist/**"],
    globalSetup: [path.resolve(__dirname, "vitest.global-setup.cjs")],
    testTimeout: 130000,
    fileParallelism: false,
    isolate: false,
    coverage: {
      enabled: process.env.COVERAGE === "true",
      include: ["services/*.js"],
      exclude: [
        "**/node_modules/**",
        "**/generated/**",
        "**/*.d.ts",
        "**/*.test.{ts,js}",
      ],
    },
  },
});
