const { spawnSync } = require("child_process");

async function getRegtestUtxos(address) {
  try {
    const { webSocket } = await import("@rpckit/websocket/electrum-cash");
    const { fallback } = await import("@rpckit/fallback");

    // Try both localhost and host.docker.internal for Docker compatibility
    const transports = ["127.0.0.1", "host.docker.internal"].map((host) =>
      webSocket(`ws://${host}:60003`)
    );
    const transport = fallback(transports);

    try {
      await transport.connect();
    } catch (e) {
      await transport.close();
      //console.log(e);
      return 0;
    }
    const response = await transport.request(
      "blockchain.address.listunspent",
      address
    );
    await transport.close();
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
