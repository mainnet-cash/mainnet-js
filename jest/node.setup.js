// jest/node.setup.js
require("dotenv").config({ path: ".env.regtest" });
require("dotenv").config({ path: ".env.testnet" });

const { spawnSync } = require("child_process");
const http = require("http");
const { abort } = require("process");
const { pingBchn, getRegtestUtxos } = require("./util/generateBlock");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let miningStarted = false;

module.exports = async function () {
  console.log("Starting regtest network...");

  let output = spawnSync("docker", ["ps"], {
    shell: false,
    stdio: "ignore"
  });

  if (output.status != 0) {
    console.error("Docker is not running in your system. Aborting.");
    process.exit(0);
  }

  if (global.fulcrumRegtest === undefined) {
    global.fulcrumRegtest = spawnSync("./jest/docker/start.sh", null, {
      shell: false,
      stdio: "inherit",
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
