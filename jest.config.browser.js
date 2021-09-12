module.exports = {
  verbose: true,
  rootDir: "./",
  roots: [
    "<rootDir>/packages/mainnet-js/src",
    "<rootDir>/packages/contract/src",
    "<rootDir>/packages/smartbch/src",
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
    "^.+\\.ts?$": "ts-jest",
  },
  globalSetup: "<rootDir>/jest/browser.setup.js",
  globalTeardown: "<rootDir>/jest/browser.teardown.js",
  testTimeout: 95000,
};
