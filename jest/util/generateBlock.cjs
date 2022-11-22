const { spawnSync } = require("child_process");
const electron = require("electrum-cash");
const cashscript = require("cashscript");

async function getRegtestUtxos(address) {
  try {
    let spv = new electron.ElectrumCluster(
      "Mainnet Regtest Client",
      "1.4.1",
      1,
      2,
      electron.ClusterOrder.RANDOM,
      1000
    );
    spv.addServer(
      "127.0.0.1",
      60003,
      electron.ElectrumTransport.WS.Scheme,
      false
    );
    let reg = new cashscript.ElectrumNetworkProvider("regtest", spv, false);
    try {
      await spv.startup();
    } catch (e) {
      spv.shutdown();
      //console.log(e);
      return 0;
    }
    return (await reg.getUtxos(address)).length;
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
    `-rpcuser=${user || 'alice'}`,
    `-rpcpassword=${password || 'password'}`,
    `-rpcport=${port || '18443'}`,
    `-rpcconnect=bitcoind`,
    "getblockchaininfo",
  ];
  let response = spawnSync(`docker`, readinessArgs);
  return response.stderr;
}

module.exports = {
  pingBchn,
  generateBlock,
  getRegtestUtxos,
};
