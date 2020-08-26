module.exports = {
  roots: ["<rootDir>/src", "<rootDir>/generated/serve"],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  setupFiles: ["fake-indexeddb/auto"],
  globalSetup: "./jest.node.setup.js",
  globalTeardown: "./jest.node.teardown.js",
};
