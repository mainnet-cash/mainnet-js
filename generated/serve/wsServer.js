const ws = require('ws');

const mainnet = require("mainnet-js");

makeWsServer = (server) => {
  const wsServer = new ws.Server({ noServer: true, path: '/api/v1/wallet' });
  wsServer.on('connection', socket => {
    socket.on('message', async data => {
      data = JSON.parse(data);
      if (data.method === "watchBalance") {
        const addr = data.data.address;
        const w = await getWallet(addr);
        await w.watchBalance((balance) => {
          socket.send(JSON.stringify(balance));
        });
      } else if (data.method === "waitForTransaction") {
        const addr = data.data.address;
        const w = await getWallet(addr);
        const rawTx = await w.waitForTransaction();
        socket.send(JSON.stringify(rawTx));
      }
    });
  });

  return wsServer;
};

getWallet = async (addr) => {
  let w = process.env.JEST_WORKER_ID === undefined ?
    new mainnet.Wallet() :
    new mainnet.RegTestWallet();
  return w.watchOnly(addr);
};

module.exports = makeWsServer;
