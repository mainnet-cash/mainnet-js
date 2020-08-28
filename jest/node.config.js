module.exports = {
  rootDir: "../",
  roots: ["<rootDir>/src", "<rootDir>/generated/serve"],
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
};
