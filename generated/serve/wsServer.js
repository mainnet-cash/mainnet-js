const ws = require('ws');

const mainnet = require("mainnet-js");

makeWsServer = (server) => {
  const wsServer = new ws.Server({ noServer: true, path: '/wallet' });
  wsServer.on('connection', socket => {
    socket.unsubscribeFunctions = [];

    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true });

    socket.on('message', async data => {
      try {
        data = JSON.parse(data);
        if (data.method === "watchBalance") {
          const addr = data.data.cashaddr;
          const w = await mainnet.Wallet.fromCashaddr(addr);
          fn = await w.watchBalance((balance) => {
            socket.send(JSON.stringify(balance));
          });
          socket.unsubscribeFunctions.push(fn);

        } else if (data.method === "waitForBalance") {
          const addr = data.data.cashaddr;
          const value = data.data.value;
          const unit = data.data.unit;
          const w = await mainnet.Wallet.fromCashaddr(addr);
          const balance = await w.waitForBalance(value, unit);
          socket.send(JSON.stringify({ balance: balance }));

        } else if (data.method === "waitForTransaction") {
          const addr = data.data.cashaddr;
          const w = await mainnet.Wallet.fromCashaddr(addr);
          const rawTx = await w.waitForTransaction();
          socket.send(JSON.stringify(rawTx));

        } else if (data.method === "waitForBlock") {
          const height = data.data.height;
          const provider = await getProvider();
          const blockHeader = await provider.waitForBlock(height);
          socket.send(JSON.stringify(blockHeader));
        } else

        // slp
        if (data.method === "slpWatchBalance") {
          const slpaddr = data.data.slpaddr;
          const tokenId = data.data.tokenId;
          const w = await getSlpWallet(slpaddr);
          fn = await w.slp.watchBalance((balance) => {
            socket.send(JSON.stringify(balance));
          }, tokenId);
          socket.unsubscribeFunctions.push(fn);

        } else if (data.method === "slpWaitForBalance") {
          const slpaddr = data.data.slpaddr;
          const value = data.data.value;
          const tokenId = data.data.tokenId;
          const w = await getSlpWallet(slpaddr);
          const balance = await w.slp.waitForBalance(value, tokenId);
          socket.send(JSON.stringify(balance));

        } else if (data.method === "slpWaitForTransaction") {
          const slpaddr = data.data.slpaddr;
          const w = await getSlpWallet(slpaddr);
          const tokenId = data.data.tokenId;
          const rawTx = await w.slp.waitForTransaction(tokenId);
          socket.send(JSON.stringify(rawTx));

        }

        // error
        else {
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

getSlpWallet = async (addr) => {
  return process.env.JEST_WORKER_ID === undefined ?
    mainnet.Wallet.fromSlpaddr(addr) :
    new mainnet.RegTestWallet().watchOnly(addr);
};

getProvider = async () => {
  let w = process.env.JEST_WORKER_ID === undefined ?
    new mainnet.Wallet() :
    new mainnet.RegTestWallet();
  return w.provider;
};

module.exports = makeWsServer;
