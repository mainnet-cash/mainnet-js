// jest/node.setup.js
require("dotenv").config({ path: ".env.regtest" });

const { spawn, spawnSync } = require("child_process");
const http = require("http");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function serverReady() {
  http
    .get("http://localhost:3000/openapi", (res) => {
      let body = "";
      res.on("data", (data) => {
        body += data;
      });
      res.on("end", () => {
        return res.statusCode === 200 ? true : false;
      });
    })
    .on("error", (err) => {
      return false;
    });
}

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
    global.mainnetServer = spawn(
      "npx",
      ["ts-node", "./generated/serve/index.ts"],
      {
        shell: false,
      }
    );
  }
  // ping express
  for (let i = 0; (await serverReady()) || i > 10; i++) {
    console.log("Waiting for express server");
    await delay(1000);
  }

  // ping bchd as a readiness signal, give up and run anyway after 10s
  for (let i = 0; (await pingBchd()).length > 0 && i < 5; i++) {
    console.log("Waiting for bchd node");
    await delay(2000);
  }

  console.log("proceeding...");
};
