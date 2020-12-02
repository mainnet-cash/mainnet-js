const ws = require('ws');
const config = require('./config');

const mainnet = require("./lib/mainnet/mainnet-node-0.0.4");
// const mainnet = require("mainnet");

const host = config.URL_PATH.match('(https?://)?(.*)')[2]
const port = config.URL_PORT;

const wsServer = new ws.Server({ host: host, port: port, path: '/api/v1/wallet', noServer: true });
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

getWallet = async (addr) => {
  let w = await mainnet.TestNetWallet.fromId(
    "watch:" + addr
  );
  w.provider = mainnet.getNetworkProvider("testnet", false, true);
  w.provider.connect();

  return w;
};

module.exports = wsServer;
