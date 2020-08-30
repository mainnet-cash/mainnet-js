require("dotenv").config({ path: ".env.regtest" });
process.env.JEST_PUPPETEER_CONFIG = "jest/browser.puppeteer.js";

const { setup: setupPuppeteer } = require("jest-environment-puppeteer");

const { spawn } = require("child_process");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sets up the environment for running tests with Jest
 */
module.exports = async function globalSetup(globalConfig) {
  // do stuff which needs to be done before all tests are executed
  await setupPuppeteer(globalConfig);
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
    global.mainnetServer = spawn(
      "npx",
      ["ts-node", "./generated/serve/index.ts"],
      {
        shell: false,
      }
    );
  }
  console.log("Waiting for readiness");
  await delay(3000);
  console.log("proceeding...");
};
