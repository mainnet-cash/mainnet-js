require("dotenv").config({ path: "../../.env.regtest" });
require("dotenv").config({ path: "../../.env.testnet" });

const setup = require("../../test/common.setup.cjs");
const teardown = require("../../test/common.teardown.cjs");

module.exports = async function () {
  await setup("../..");
  return async () => {
    await teardown("../..");
  };
};
