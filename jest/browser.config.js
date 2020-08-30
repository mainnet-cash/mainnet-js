module.exports = {
  rootDir: "../",
  preset: "jest-puppeteer",
  roots: ["<rootDir>/src"],
  testMatch: ["**/?(*.)+(spec|test|headless).[t|j]s"],
  testPathIgnorePatterns: ["/node_modules/", "dist"], //
  testEnvironment: "jsdom",
  setupFiles: ["fake-indexeddb/auto"],
  setupFilesAfterEnv: ["<rootDir>/jest/browser.puppeteer.js"],
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  globalSetup: "<rootDir>/jest/browser.setup.js",
  globalTeardown: "<rootDir>/jest/node.teardown.js",
};
