// jest/node.setup.js
require("dotenv").config({ path: ".env.regtest" });
const { spawn } = require("child_process");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async function () {
  console.log("starting bchd ...");

  if (global.bchDaemon === undefined) {
    const bchdArgs = [
      `--${process.env.NETWORK}`,
      `--rpclisten=:${process.env.PORT}`,
      `--grpclisten=${process.env.HOST_IP}:${process.env.GRPC_PORT}`,
      `--rpcuser=${process.env.RPC_USER}`,
      `--rpcpass=${process.env.RPC_PASS}`,
      `--miningaddr=${process.env.ADDRESS}`,
      `--addrindex`,
      `--txindex`,
    ];
    global.bchDaemon = spawn("./bin/bchd", bchdArgs, { shell: false });
    console.log("... OKAY");
  } else {
    console.log("...already running");
  }
  if (global.mainnetServer === undefined) {
    global.mainnetServer = spawn("npx", ["ts-node", "./serve/index.ts"], {
      shell: false,
    });
  }
  console.log("Waiting for readiness");
  await delay(3000);
  console.log("proceeding...");
};
