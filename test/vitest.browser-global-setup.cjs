// Simplified browser global setup — no more reload server needed.
// Vitest browser mode handles serving test files via Vite.
const setup = require("./common.setup.cjs");
const teardown = require("./common.teardown.cjs");

module.exports = async function () {
  await setup();
  return async () => {
    await teardown();
  };
};
