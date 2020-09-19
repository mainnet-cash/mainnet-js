// jest/browser.setup.js
require("dotenv").config({ path: ".env.regtest" });

const { spawn, spawnSync } = require("child_process");
const http = require("http");
const { GrpcClient } = require("grpc-bchrpc-node");

async function getBlockHeight() {
  let url = `${process.env.HOST_IP}:${process.env.GRPC_PORT}`;
  const cert = `${process.env.BCHD_BIN_DIRECTORY}/${process.env.RPC_CERT}`;
  const host = `${process.env.HOST}`;
  let client = new GrpcClient({
    url: url,
    testnet: true,
    rootCertPath: cert,
    options: {
      "grpc.ssl_target_name_override": host,
      "grpc.default_authority": host,
      "grpc.max_receive_message_length": -1,
    },
  });
  let blockchainInfo = await client.getBlockchainInfo();
  return blockchainInfo.getBestHeight();
}

async function pingBchd() {
  const readinessArgs = [
    `--rpcuser=${process.env.RPC_USER}`,
    `--rpcpass=${process.env.RPC_PASS}`,
    `--testnet`,
    "ping",
  ];
  let response = await spawnSync(
    `${process.env.BCHD_BIN_DIRECTORY}/bchctl`,
    readinessArgs
  );
  return response.stderr;
}

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

function generateBlock(user, password, numberOfBlocks, binDir) {
  const bchctlArgs = [
    `--testnet`,
    `--rpcuser=${user}`,
    `--rpcpass=${password}`,
    `generate`,
    `--skipverify`,
    numberOfBlocks,
  ];

  const bchctl = spawnSync(`${binDir}/bchctl`, bchctlArgs);
  if (bchctl.stderr.length > 0) {
    throw Error(bchctl.stderr.toString());
  }
  return JSON.parse(bchctl.stdout.toString());
}

/**
 * Sets up the environment for running tests with Jest
 */
module.exports = async function globalSetup(globalConfig) {
  // do stuff which needs to be done before all tests are executed

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
      `-d=critical`, // prevent daemon messages from overrunning the process buffer
    ];
    global.bchDaemon = spawn("./bin/bchd", bchdArgs, { shell: false });
    console.log("... OKAY");
  } else {
    console.log("...already running");
  }
  if (global.moduleServer === undefined) {
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

  // ping bchd as a readiness signal, give up and run anyway after 10s
  for (let i = 0; (await pingBchd()).length > 0 && i < 5; i++) {
    console.log("Waiting for bchd node");
    await delay(2000);
  }

  for (let i = 0; (await getBlockHeight()) < 100 && i < 15; i++) {
    console.log("Waiting blocks to be mined");
    generateBlock(
      process.env.RPC_USER || "alice",
      process.env.RPC_PASS || "password",
      105,
      process.env.BCHD_BIN_DIRECTORY || "bin"
    );
    await delay(2000);
  }
  console.log("proceeding...");
};
