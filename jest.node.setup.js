// jest.node.setup.js
require("dotenv").config();
const { spawn } = require("child_process");

module.exports = async function () {
  console.log("starting bchd ...");
  if (global.bchDaemon === undefined) {
    const bchdArgs = [
      "--regtest",
      `--rpclisten=:${process.env.REGTEST_PORT}`,
      `--rpcuser=${process.env.REGTEST_USER}`,
      `--rpcpass=${process.env.REGTEST_PASS}`,
      `--miningaddr=${process.env.REGTEST_ADDRESS}`,
    ];
    global.bchDaemon = spawn("./bin/bchd", bchdArgs, { shell: false });
    console.log("... OKAY");
  } else {
    console.log("...already running");
  }
};
