// jest/browser.setup.js
require("dotenv").config({ path: "../../.env.regtest" });
require("dotenv").config({ path: "../../.env.testnet" });
const commonSetup = require("../../../jest/common.setup");

const { spawn } = require("child_process");
const http = require("http");

function serverReady() {
  return new Promise((resolve) => {
    let req = http.get("http://localhost:8080/");

    req.on("response", () => {
      resolve(true);
    });

    req.on("error", () => {
      resolve(false);
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sets up the environment for running tests with Jest
 */
module.exports = async function globalSetup(globalConfig) {
  // do stuff which needs to be done before all tests are executed

  if (global.moduleServer === undefined) {
    console.log("Starting html server");
    let npx = process.platform === "win32" ? "npx.cmd" : "npx";
    global.moduleServer = spawn(npx, ["reload", "--dir=jest/playwright/"], {
      shell: false,
      detached: false,
    });
  }

  // ping html
  for (let i = 0; !(await serverReady()) && i < 10; i++) {
    console.log("Waiting for html server");
    await delay(1000);
  }

  console.log("proceeding...");

  await commonSetup();
};
