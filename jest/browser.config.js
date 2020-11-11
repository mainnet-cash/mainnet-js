module.exports = {
  verbose: true,
  rootDir: "../",
  preset: "jest-playwright-preset",
  collectCoverageFrom: [
    "**/*.{js,jsx,ts}",
    "!**/node_modules/**",
    "!**/generated/**",
  ],
  coveragePathIgnorePatterns: [
    ".*/src/.*\\.d\\.ts",
    ".*/src/.*\\.test\\.{ts,js}",
    ".*/src/.*\\.test\\.headless\\.js",
  ],
  roots: ["<rootDir>/src"],
  testMatch: ["**/?(*.)+(test.headless).[t|j]s"],
  testPathIgnorePatterns: ["/node_modules/"], //
  testEnvironment: "node",
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  globalSetup: "<rootDir>/jest/browser.setup.js",
  globalTeardown: "<rootDir>/jest/browser.teardown.js",
  testTimeout: 3600000,
};
