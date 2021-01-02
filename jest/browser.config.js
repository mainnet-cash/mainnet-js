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
  ],
  roots: ["<rootDir>/src"],
  testMatch: ["**/**.test.headless.js"],
  testPathIgnorePatterns: ["/node_modules/"], //
  testEnvironment: "node",
  testEnvironmentOptions: {
    'jest-playwright': {
      'browsers':['chromium', 'firefox', 'webkit']
    },
  },
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  globalSetup: "<rootDir>/jest/browser.setup.js",
  globalTeardown: "<rootDir>/jest/browser.teardown.js",
  testTimeout: 60000,
};
