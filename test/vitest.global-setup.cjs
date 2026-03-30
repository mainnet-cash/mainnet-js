const setup = require("./common.setup.cjs");
const teardown = require("./common.teardown.cjs");

module.exports = async function () {
  await setup();
  return async () => {
    await teardown();
  };
};
