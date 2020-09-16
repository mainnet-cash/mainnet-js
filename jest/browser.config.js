module.exports = {
  verbose: true,
  rootDir: "../",
  preset: "jest-playwright-preset",
  roots: ["<rootDir>/src"],
  testMatch: ["**/?(*.)+(headless).[t|j]s"],
  testPathIgnorePatterns: ["/node_modules/", "dist"], //
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  globalSetup: "<rootDir>/jest/browser.setup.js",
  globalTeardown: "<rootDir>/jest/browser.teardown.js",
};
