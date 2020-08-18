// jest.node.setup.js
require("dotenv").config();
const { spawn } = require("child_process");

module.exports = async function () {
  console.log("starting bchd ...");
  
  if (global.bchDaemon === undefined) {
    const bchdArgs = [
      "--regtest",
      `--rpclisten=:${process.env.REGTEST_PORT}`,
      `--grpclisten=${process.env.REGTEST_HOST_IP}:${process.env.REGTEST_GRPC_PORT}`,
      `--rpcuser=${process.env.REGTEST_USER}`,
      `--rpcpass=${process.env.REGTEST_PASS}`,
      `--miningaddr=${process.env.REGTEST_ADDRESS}`,
      `--addrindex`,
      `--txindex`
    ];
    global.bchDaemon = spawn("./bin/bchd", bchdArgs, { shell: false });
    console.log("... OKAY");
  } else {
    console.log("...already running");
  }
  
};
