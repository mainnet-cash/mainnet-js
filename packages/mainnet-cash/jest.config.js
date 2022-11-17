module.exports = {
  rootDir: "./",
  collectCoverage: true,
  preset: 'ts-jest/presets/default-esm',

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
  transformIgnorePatterns: ['node_modules/(?!@bitauth/libauth)'],
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  globalSetup: "<rootDir>/jest/node.setup.js",
  globalTeardown: "<rootDir>/jest/node.teardown.js",
  verbose: true,
  maxConcurrency: 1,
  testTimeout: 130000,
};
