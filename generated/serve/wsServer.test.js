const ws = require('ws');
const config = require('./config');
const server = require("./");

let alice = process.env.ADDRESS;
let aliceWif = `wif:regtest:${process.env.PRIVATE_WIF}`

describe("Test websocket server methods", () => {
  beforeAll(async function () {
    app = await server.startServer();
  });
  afterAll(async function () {
    await server.killElectrum()
    app.close();
  });

  test("Test watchBalance ws method", async () => {
    const wsClient = new ws(`ws://localhost:${config.URL_PORT}/api/v1/wallet`);
    let response;

    wsClient.on('open', () => {
      wsClient.send(JSON.stringify({ method: "watchBalance", data: { address: alice}}));
    });

    wsClient.on('message', (message) => {
      response = message;
    });

    await new Promise(resolve => setTimeout(resolve), 3000);
    console.log(response);
    expect(response.bch).toBeDefined();
    expect(response.bch).toBeGreaterThan(0.1);
  });

  // test("Test concurrent ws watchBalance", async () => {
  //   const wsClient = new ws(`ws://localhost:${config.URL_PORT}/api/v1/wallet`);

  //   wsClient.on('open', () => {
  //     wsClient.send(JSON.stringify({ method: "watchBalance", data: { address: "testnet:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22" } }));
  //     wsClient.send(JSON.stringify({ method: "watchBalance", data: { address: "testnet:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22" } }));
  //   });

  //   wsClient.on('message', (message) => {
  //     console.log(message);
  //   });

  //   await new Promise(resolve => setTimeout(async () => {
  //     resolve();
  //   }, 3000));
  // });

  test("Test waitForTransaction ws method", async () => {
    const wsClient = new ws(`ws://localhost:${config.URL_PORT}/api/v1/wallet`);

    wsClient.on('open', () => {
      wsClient.send(JSON.stringify({ method: "waitForTransaction", data: { address: alice } }));
    });

    wsClient.on('message', (message) => {
      console.log(message);
    });

    await new Promise(resolve => setTimeout(resolve), 3000);
  });
});
