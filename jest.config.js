module.exports = {
  rootDir: "./",
  collectCoverage: true,
  collectCoverageFrom: [
    "**/*.{js,jsx,ts}",
    "!**/node_modules/**",
    "!**/packages/mainnet-cash/**",
  ],
  coveragePathIgnorePatterns: [
    ".*/src/.*\\.d\\.ts",
    ".*/src/.*\\.test\\.{ts,js}",
    ".*/src/.*\\.test\\.headless\\.js",
  ],
  roots: [
    "<rootDir>/packages/mainnet-js/src",
    "<rootDir>/packages/contract/src",
    "<rootDir>/packages/smartbch/src",
  ],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  testEnvironment: "node",
  setupFiles: ["fake-indexeddb/auto"],
  globalSetup: "<rootDir>/jest/node.setup.js",
  globalTeardown: "<rootDir>/jest/node.teardown.js",
  verbose: true,
  maxConcurrency: 1,
  testTimeout: 125000,
};
