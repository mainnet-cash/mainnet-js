module.exports = {
  rootDir: "./",
  collectCoverage: true,

  collectCoverageFrom: [
    "services/*.{js}",
    "!**/node_modules/**",
    "!**/generated/**",
  ],
  coveragePathIgnorePatterns: [
    ".*/services/.*\\.d\\.ts",
    ".*/services/.*\\.test\\.{ts,js}",
    ".*/services/.*\\.test\\.headless\\.js",
  ],
  roots: ["<rootDir>/"],
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
  testTimeout: 65000,
};
