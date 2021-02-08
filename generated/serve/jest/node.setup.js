// jest/node.setup.js
const commonSetup = require("../../../jest/common.setup");
require("dotenv").config({ path: "../../.env.regtest" });
require("dotenv").config({ path: "../../.env.testnet" });


module.exports = async () => {
  await commonSetup("../..");
}
