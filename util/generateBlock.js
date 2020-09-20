const { spawnSync } = require("child_process");
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
  console.log("block height: " + blockchainInfo.getBestHeight());
  return blockchainInfo.getBestHeight();
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

function pingBchd() {
  const readinessArgs = [
    `--rpcuser=${process.env.RPC_USER}`,
    `--rpcpass=${process.env.RPC_PASS}`,
    `--testnet`,
    "ping",
  ];
  let response = spawnSync(
    `${process.env.BCHD_BIN_DIRECTORY}/bchctl`,
    readinessArgs
  );
  return response.stderr;
}

module.exports = {
  pingBchd,
  generateBlock,
  getBlockHeight,
};
