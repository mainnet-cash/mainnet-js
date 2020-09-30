// jest/node.setup.js
require("dotenv").config({ path: ".env.regtest" });
require("dotenv").config({ path: ".env.testnet" });

const { spawn } = require("child_process");
const http = require("http");
const {
  pingBchn,
  generateBlock,
  getBlockHeight,
} = require("../util/generateBlock");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let miningStarted = false;

module.exports = async function () {
  console.log("Starting regtest network...");

  if (global.fulcrumRegtest === undefined) {
    global.fulcrumRegtest = spawn("./docker/start.sh", null, { shell: false });
    console.log("... OKAY");
  } else {
    console.log("... docker already running");
  }

  // ping bchd as a readiness signal, give up and run anyway after 10s
  for (let i = 0; (await pingBchn()).length > 0 && i < 5; i++) {
    console.log("Waiting for bchn node");
    await delay(2000);
  }

  for (let i = 0; (await getBlockHeight()) < 105 && i < 15; i++) {
    console.log("Waiting for blocks to be mined");
    if (!miningStarted) {
      generateBlock(
        process.env.RPC_USER,
        process.env.RPC_PASS,
        process.env.PORT,
        105,
        process.env.ADDRESS
      );
    }
    console.log("block height: " + (await getBlockHeight()));
    await delay(61000);
  }
  console.log("proceeding...");
};
