// jest.node.setup.js
require("dotenv").config({ path: ".env.regtest" });
const { spawn, spawnSync } = require("child_process");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pingBchd(){
  const readinessArgs = [
    `--rpcuser=${process.env.RPC_USER}`,
    `--rpcpass=${process.env.RPC_PASS}`,
    `--testnet`,
    "ping"
  ] 
  let response = await spawnSync(
    `${process.env.BCHD_BIN_DIRECTORY}/bchctl`,
    readinessArgs
  );
  return response.stderr
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
  
  // ping bchd as a readiness signal, give up and run anyway after 10s
  for (let i=0; ((await pingBchd()).length > 0)  && i < 5; i++){
    console.log("Waiting for readiness");
    await delay(2000);
  }
  console.log("proceeding...");
};
