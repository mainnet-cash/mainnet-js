module.exports = {
  rootDir: "./src",
  collectCoverage: true,
  collectCoverageFrom: ["**/*.{js,jsx,ts}", "!**/node_modules/**"],
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
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  testEnvironment: "node",
  verbose: true,
  maxConcurrency: 1,
  testTimeout: 125000,
};
