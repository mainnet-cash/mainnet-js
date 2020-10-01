const { spawnSync } = require("child_process");
const electron = require("electrum-cash");
const cashscript = require("cashscript");
const { JSON_SCHEMA } = require("js-yaml");

async function getBlockHeight() {
  try{
    let spv = new electron.ElectrumCluster(
      "Mainnet Regtest Client",
      "1.4.1",
      1,
      2
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
      console.log(e);
      return 0;
    }
    return reg.getBlockHeight();
  
  } catch(e){
    console.log("Error getting block height" + e)
    return 0
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
    `-it`,
    `regtest`,
    `bitcoin-cli`,
    `--rpcuser=${user}`,
    `--rpcpassword=${password}`,
    `--rpcport=${port}`,
    "getblockchaininfo",
  ];
  let response = spawnSync(`docker`, readinessArgs);
  return response.stderr;
}

module.exports = {
  pingBchn,
  generateBlock,
  getBlockHeight,
};
