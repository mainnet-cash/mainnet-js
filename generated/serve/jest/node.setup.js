// jest/node.setup.js
require("dotenv").config({ path: "../../.env.regtest" });
require("dotenv").config({ path: "../../.env.testnet" });

const { spawn } = require("child_process");
const http = require("http");
const { pingBchn, getRegtestUtxos } = require("../../../jest/util/generateBlock");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async function () {
  if (process.env.SKIP_REGTEST_INIT) {
    return;
  }

  console.log("Starting regtest network...");

  if (global.fulcrumRegtest === undefined) {
    global.fulcrumRegtest = spawn("./jest/docker/start.sh", null, {
      cwd: "../../",
      shell: false,
    });
    console.log("... OKAY");
  } else {
    console.log("... docker already running");
  }

  // ping bchd as a readiness signal, give up and run anyway after 10s
  for (let i = 0; (await pingBchn()).length > 0 && i < 5; i++) {
    console.log("Waiting for bchn node");
    await delay(2000);
  }

  for (
    let i = 0;
    (await getRegtestUtxos(process.env.ADDRESS)) < 105 && i < 45;
    i++
  ) {
    console.log("Waiting for blocks to be mined");
    await delay(2000);
  }
  console.log("utxos: " + (await getRegtestUtxos(process.env.ADDRESS)).length);
  console.log("proceeding...");
};
