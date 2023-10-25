module.exports = {
  rootDir: "./",
  preset: "ts-jest/presets/default-esm",
  resolver: "ts-jest-resolver",
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
    "<rootDir>/packages/indexeddb-storage/src",
    "<rootDir>/packages/postgresql-storage/src",
  ],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  testEnvironment: "node",
  setupFiles: ["fake-indexeddb/auto"],
  globalSetup: "<rootDir>/jest/node.setup.cjs",
  globalTeardown: "<rootDir>/jest/node.teardown.cjs",
  verbose: true,
  maxConcurrency: 4,
  testTimeout: 125000,
};
