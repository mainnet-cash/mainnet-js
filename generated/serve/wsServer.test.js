const ws = require('ws');
const config = require('./config');
const ExpressServer = require('./expressServer');

test("Test watchBalance ws method", async () => {
  let expressServer = new ExpressServer(config.URL_PORT, config.OPENAPI_YAML, config.DOC_YAML);
  expressServer.launch();

  const wsClient = new ws(`ws://localhost:${config.URL_PORT}/api/v1/wallet`);

  wsClient.on('open', () => {
    wsClient.send(JSON.stringify({ method: "watchBalance", data: { address: "testnet:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22"}}));
  });

  wsClient.on('message', (message) => {
    console.log(message);
  });

  await new Promise(resolve => setTimeout(async () => {
    await expressServer.close();
    resolve();
  }, 3000));
});

test("Test concurrent ws watchBalance", async () => {
  let expressServer = new ExpressServer(config.URL_PORT, config.OPENAPI_YAML, config.DOC_YAML);
  expressServer.launch();

  const wsClient = new ws(`ws://localhost:${config.URL_PORT}/api/v1/wallet`);

  wsClient.on('open', () => {
    wsClient.send(JSON.stringify({ method: "watchBalance", data: { address: "testnet:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22" } }));
    wsClient.send(JSON.stringify({ method: "watchBalance", data: { address: "testnet:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22" } }));
  });

  wsClient.on('message', (message) => {
    console.log(message);
  });

  await new Promise(resolve => setTimeout(async () => {
    await expressServer.close();
    resolve();
  }, 3000));
});

test("Test waitForTransaction ws method", async () => {
  let expressServer = new ExpressServer(config.URL_PORT, config.OPENAPI_YAML, config.DOC_YAML);
  expressServer.launch();

  const wsClient = new ws(`ws://localhost:${config.URL_PORT}/api/v1/wallet`);

  wsClient.on('open', () => {
    wsClient.send(JSON.stringify({ method: "waitForTransaction", data: { address: "testnet:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22" } }));
  });

  wsClient.on('message', (message) => {
    console.log(message);
  });

  await new Promise(resolve => setTimeout(async () => {
    await expressServer.close();
    resolve();
  }, 3000));
});
