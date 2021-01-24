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
    app.close();
    await server.killElectrum();
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  test("Test watchBalance ws method", async () => {
    await request(app)
      .ws('/api/v1/wallet')
      .sendJson({ method: "watchBalance", data: { cashaddr: alice }})
      .expectJson((actual) => (actual.bch > 0.1))
      .close()
      .expectClosed();
  });

  test("Test waitForBalance ws method", async () => {
    let aliceWallet = await mainnet.RegTestWallet.fromId(aliceWif);
    let bobWallet = await mainnet.RegTestWallet.newRandom();

    setTimeout(async () => {
      await aliceWallet.send([
      {
        cashaddr: bobWallet.cashaddr,
        value: 1000,
        unit: "satoshis",
      },
    ])}, 2000);

    await request(app)
      .ws('/api/v1/wallet')
      .sendJson({ method: "waitForBalance", data: { cashaddr: bobWallet.cashaddr, value: 500, unit: "satoshi" }})
      .expectJson((actual) => (actual.balance >= 500))
      .close()
      .expectClosed();
  });

  test("Test waitForTransaction ws method", async () => {
    let aliceWallet = await mainnet.RegTestWallet.fromId(aliceWif);
    let bobWallet = await mainnet.RegTestWallet.newRandom();

    setTimeout(async () => {
      await aliceWallet.send([
      {
        cashaddr: bobWallet.cashaddr,
        value: 1000,
        unit: "satoshis",
      },
    ])}, 1000);

    await request(app)
      .ws('/api/v1/wallet')
      .sendJson({ method: "waitForTransaction", data: { cashaddr: alice }})
      .expectJson((actual) => (actual !== undefined && actual.hash !== undefined))
      .close()
      .expectClosed();
  });

  test("Test waitForBlock ws method", async () => {
    let aliceWallet = await mainnet.RegTestWallet.fromId(aliceWif);

    const height = await aliceWallet.provider.getBlockHeight();

    setTimeout(
      async () => await mainnet.mine({ cashaddr: aliceWallet.cashaddr, blocks: 1 }),
      2000
    );
    await request(app)
      .ws('/api/v1/wallet')
      .sendJson({ method: "waitForBlock", data: { height: undefined }})
      .expectJson((actual) => (actual.height === (height + 1)))
      .close()
      .expectClosed();

    setTimeout(
      async () => await mainnet.mine({ cashaddr: aliceWallet.cashaddr, blocks: 1 }),
      2000
    );

    await request(app)
      .ws('/api/v1/wallet')
      .sendJson({ method: "waitForBlock", data: { height: height + 2 }})
      .expectJson((actual) => (actual.height === (height + 2)))
      .close()
      .expectClosed();
  });
});
