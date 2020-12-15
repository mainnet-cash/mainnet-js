const ws = require('ws');
const config = require('./config');
const server = require("./");
const mainnet = require("mainnet-js");

let alice = process.env.ADDRESS;
let aliceWif = `wif:regtest:${process.env.PRIVATE_WIF}`

let app;
const request = require("superwstest").default;

describe("Test websocket server methods", () => {
  beforeAll(async function () {
    app = await server.getServer().launch();
  });
  afterAll(async function () {
    await server.killElectrum()
    app.close();
  });

  test("Test watchBalance ws method", async () => {
    await request(app)
      .ws('/api/v1/wallet')
      .sendJson({ method: "watchBalance", data: { address: alice}})
      .expectJson((actual) => (actual.bch > 0.1))
      .close()
      .expectClosed();
  });

  test("Test waitForTransaction ws method", async () => {
    let aliceWallet = await mainnet.RegTestWallet.fromId(aliceWif);
    let bobWallet = await mainnet.RegTestWallet.newRandom();

    aliceWallet.send([
      {
        cashaddr: bobWallet.cashaddr,
        value: 1000,
        unit: "satoshis",
      },
    ]);

    await request(app)
      .ws('/api/v1/wallet')
      .sendJson({ method: "waitForTransaction", data: { address: alice}})
      .expectJson((actual) => (actual !== undefined && actual.hash !== undefined))
      .close()
      .expectClosed();
  });
});
