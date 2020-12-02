const ws = require('ws');

const mainnet = require("mainnet");

const wsServer = new ws.Server({ noServer: true });
wsServer.on('connection', socket => {
  socket.on('message', async data => {
    data = JSON.parse(data);
    if (data.method === "watchBalance") {
      const addr = data.data.address;
      let w = await mainnet.TestNetWallet.fromId(
        "watch:"+addr
      );
      console.log(mainnet.getNetworkProvider);
      w.provider = mainnet.getNetworkProvider("testnet", false, true);
      w.provider.connect();

      await w.watchBalance((balance) => {
        socket.send(JSON.stringify(balance));
      });
    }
  });
});

module.exports = wsServer;
