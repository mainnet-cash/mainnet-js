// jest/node.setup.js
require("dotenv").config({ path: ".env.regtest" });
require("dotenv").config({ path: ".env.testnet" });

const { spawn } = require("child_process");
const http = require("http");
// const {
//   pingBchd,
//   generateBlock,
//   getBlockHeight,
// } = require("../util/generateBlock");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let miningStarted = false;

module.exports = async function () {
  console.log("starting bchd ...");

  // if (global.bchDaemon === undefined) {
  //   const bchdArgs = [
  //     `--${process.env.NETWORK}`,
  //     `--rpclisten=:${process.env.PORT}`,
  //     `--grpclisten=${process.env.HOST_IP}:${process.env.GRPC_PORT}`,
  //     `--rpcuser=${process.env.RPC_USER}`,
  //     `--rpcpass=${process.env.RPC_PASS}`,
  //     `--miningaddr=${process.env.ADDRESS}`,
  //     `--addrindex`,
  //     `--txindex`,
  //     `-d=critical`, // prevent daemon messages from overrunning the process buffer
  //   ];
  //   global.bchDaemon = spawn("./bin/bchd", bchdArgs, { shell: false });
  //   console.log("... OKAY");
  // } else {
  //   console.log("...bchd already running");
  // }

  // // ping bchd as a readiness signal, give up and run anyway after 10s
  // for (let i = 0; (await pingBchd()).length > 0 && i < 5; i++) {
  //   console.log("Waiting for bchd node");
  //   await delay(2000);
  // }

  // for (let i = 0; (await getBlockHeight()) < 100 && i < 15; i++) {
  //   console.log("Waiting for blocks to be mined");
  //   if (!miningStarted) {
  //     generateBlock(
  //       process.env.RPC_USER || "alice",
  //       process.env.RPC_PASS || "password",
  //       105,
  //       process.env.BCHD_BIN_DIRECTORY || "bin"
  //     );
  //   }
  //   console.log("block height: " + (await getBlockHeight()));
  //   await delay(200);
  // }
  console.log("proceeding...");
};
