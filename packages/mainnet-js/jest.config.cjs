module.exports = {
  preset: 'ts-jest/presets/default-esm',
  resolver: "ts-jest-resolver",
  rootDir: "./",
  collectCoverage: true,
  collectCoverageFrom: ["./src/**/*.{js,jsx,ts}", "!**/node_modules/**"],
  coveragePathIgnorePatterns: [
    ".*/src/.*\\.d\\.ts",
    ".*/src/.*\\.test\\.{ts,js}",
    ".*/src/.*\\.test\\.headless\\.js",
  ],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
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
  maxConcurrency: 1,
  testTimeout: 125000,
};
