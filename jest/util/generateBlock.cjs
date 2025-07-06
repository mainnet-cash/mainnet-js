const { spawnSync } = require("child_process");
const electron = require("@electrum-cash/network");
const websocket = require("@electrum-cash/web-socket");

async function getRegtestUtxos(address) {
  try {
    const webSocket = new websocket.ElectrumWebSocket(
      "127.0.0.1",
      60003,
      false
    );
    const spv = new electron.ElectrumClient(
      "Mainnet.Cash Regtest Client",
      "1.5",
      webSocket
    );
    try {
      await spv.connect();
    } catch (e) {
      spv.disconnect();
      //console.log(e);
      return 0;
    }
    const response = await spv.request(
      "blockchain.address.listunspent",
      address
    );
    spv.disconnect();
    return response.length;
  } catch (e) {
    console.log("Error getting block height" + e);
    return 0;
  }
}

function generateBlock(user, password, port, numberOfBlocks, address) {
  const generateArgs = [
    `exec`,
    `regtest`,
    `bitcoin-cli`,
    `--rpcuser=${user}`,
    `--rpcpassword=${password}`,
    `--rpcport=${port}`,
    `generatetoaddress`,
    numberOfBlocks,
    address,
  ];

  const cli = spawnSync(`docker`, generateArgs);
  if (cli.stderr.length > 0) {
    console.log(cli.stderr.toString());
  }
  return JSON.parse(cli.stdout.toString());
}

function pingBchn(user, password, port) {
  const readinessArgs = [
    `exec`,
    `bitcoind`,
    `bitcoin-cli`,
    `-rpcuser=${user || "alice"}`,
    `-rpcpassword=${password || "password"}`,
    `-rpcport=${port || "18443"}`,
    `-rpcconnect=bitcoind`,
    "getblockchaininfo",
  ];
  const response = spawnSync(`docker`, readinessArgs);
  return response.stderr;
}

module.exports = {
  pingBchn,
  generateBlock,
  getRegtestUtxos,
};
