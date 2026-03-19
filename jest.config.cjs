module.exports = {
  rootDir: "./",
  preset: "ts-jest/presets/default-esm",
  resolver: "ts-jest-resolver",
  collectCoverage: process.env.COVERAGE === "true",
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
    "<rootDir>/packages/indexeddb-storage/src",
    "<rootDir>/packages/postgresql-storage/src",
    "<rootDir>/packages/bcmr/src",
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
  moduleNameMapper: {
    "^@rpckit/websocket/electrum-cash$": "<rootDir>/node_modules/@rpckit/websocket/dist/electrum-cash/index.js",
    "^@rpckit/fallback/electrum-cash$": "<rootDir>/node_modules/@rpckit/fallback/dist/electrum-cash/index.js",
  },
  testEnvironment: "node",
  setupFiles: ["fake-indexeddb/auto", "node-localstorage/register"],
  globalSetup: "<rootDir>/jest/node.setup.cjs",
  globalTeardown: "<rootDir>/jest/node.teardown.cjs",
  verbose: true,
  maxConcurrency: 1,
  testTimeout: 125000,
};
