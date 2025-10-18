module.exports = {
  verbose: true,
  rootDir: "./",
  preset: "jest-playwright-preset",
  roots: [
    "<rootDir>/packages/mainnet-js/src",
    "<rootDir>/packages/contract/src",
    "<rootDir>/packages/indexeddb-storage/src",
    "<rootDir>/packages/bcmr/src",
  ],
  preset: "jest-playwright-preset",
  collectCoverageFrom: ["**/*.{js}", "!**/node_modules/**", "!**/generated/**"],
  coveragePathIgnorePatterns: [
    ".*/src/.*\\.d\\.ts",
    ".*/src/.*\\.test\\.{ts,js}",
  ],
  testMatch: ["**/**.test.headless.js"],
  testPathIgnorePatterns: ["/node_modules/"], //
  testEnvironment: "node",
  testEnvironmentOptions: {
    "jest-playwright": {
      browsers: ["chromium", "firefox", "webkit"],
    },
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  globalSetup: "<rootDir>/jest/browser.setup.cjs",
  globalTeardown: "<rootDir>/jest/browser.teardown.cjs",
  testTimeout: 95000,
};
