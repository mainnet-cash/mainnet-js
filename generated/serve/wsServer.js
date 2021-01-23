const ws = require('ws');

const mainnet = require("mainnet-js");

makeWsServer = (server) => {
  const wsServer = new ws.Server({ noServer: true, path: '/api/v1/wallet' });
  wsServer.on('connection', socket => {
    socket.unsubscribeFunctions = [];

    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true });

    socket.on('message', async data => {
      try {
        data = JSON.parse(data);
        if (data.method === "watchBalance") {
          const addr = data.data.cashaddr;
          const w = await getWallet(addr);
          fn = await w.watchBalance((balance) => {
            socket.send(JSON.stringify(balance));
          });
          socket.unsubscribeFunctions.push(fn);

        } else if (data.method === "waitForBalance") {
          const addr = data.data.cashaddr;
          const value = data.data.value;
          const unit = data.data.unit;
          const w = await getWallet(addr);
          const balance = await w.waitForBalance(value, unit);
          socket.send(JSON.stringify({ balance: balance }));

        } else if (data.method === "waitForTransaction") {
          const addr = data.data.cashaddr;
          const w = await getWallet(addr);
          const rawTx = await w.waitForTransaction();
          socket.send(JSON.stringify(rawTx));

        } else if (data.method === "waitForBlock") {
          const height = data.data.height;
          const provider = await getProvider();
          const blockHeader = await provider.waitForBlock(height);
          socket.send(JSON.stringify(blockHeader));
          console.log(JSON.stringify(blockHeader));
        } else {
          throw Error(`Mainnet websockets: unsupported method ${data.method}`);
        }
      } catch (e) {
        socket.send(JSON.stringify({error: e.message}));
      }
    });

    socket.on('close', async () => {
      socket.unsubscribeFunctions.forEach(async () => {
        await fn();
      });
      socket.unsubscribeFunctions = [];
    });
  });

  const ping = setInterval(() => {
    wsServer.clients.forEach(function each(socket) {
      if (socket.isAlive === false) return socket.terminate();

      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wsServer.on('close', () => {
    clearInterval(ping);
    wsServer.clients.forEach((socket) => {
      socket.close();
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

getProvider = async () => {
  let w = process.env.JEST_WORKER_ID === undefined ?
    new mainnet.Wallet() :
    new mainnet.RegTestWallet();
  return w.provider;
};

module.exports = makeWsServer;
