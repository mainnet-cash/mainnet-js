const ws = require('ws');
const config = require('./config');
const server = require("./");
const mainnet = require("mainnet-js");


const alice = process.env.ADDRESS;
const aliceSlp = alice; //mainnet.toSlpAddress(alice);
const aliceWif = `wif:regtest:${process.env.PRIVATE_WIF}`;

let app;
const request = require("superwstest").default;

const ticker = Math.random().toString(36).substring(8).toUpperCase();
let tokenId;

const genesisOptions = {
  name: "Mainnet coin",
  ticker: ticker,
  decimals: 2,
  initialAmount: 10000,
  documentUrl: "https://mainnet.cash",
  documentHash:
    "0000000000000000000000000000000000000000000000000000000000000000",
};

describe("Test websocket server methods", () => {
  beforeAll(async function () {
    app = await server.getServer().launch();
    const aliceWallet = await mainnet.RegTestWallet.fromId(aliceWif);
    const genesisResult = await aliceWallet.slp.genesis(genesisOptions);
    tokenId = genesisResult.tokenId;
  });
  afterAll(async function () {
    app.close();
    await server.killElectrum();
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  test("Test watchBalance ws method", async () => {
    await request(app)
      .ws('/wallet')
      .sendJson({ method: "watchBalance", data: { cashaddr: alice }})
      .expectJson((actual) => (actual.bch > 0.1))
      .close()
      .expectClosed();
  });

  test("Test waitForBalance ws method", async () => {
    const aliceWallet = await mainnet.RegTestWallet.fromId(aliceWif);
    const bobWallet = await mainnet.RegTestWallet.newRandom();

    setTimeout(async () => {
      await aliceWallet.send([
      {
        cashaddr: bobWallet.cashaddr,
        value: 1000,
        unit: "satoshis",
      },
    ])}, 2000);

    await request(app)
      .ws('/wallet')
      .sendJson({ method: "waitForBalance", data: { cashaddr: bobWallet.cashaddr, value: 500, unit: "satoshi" }})
      .expectJson((actual) => (actual.balance >= 500))
      .close()
      .expectClosed();
  });

  test("Test waitForTransaction ws method", async () => {
    const aliceWallet = await mainnet.RegTestWallet.fromId(aliceWif);
    const bobWallet = await mainnet.RegTestWallet.newRandom();

    setTimeout(async () => {
      await aliceWallet.send([
      {
        cashaddr: bobWallet.cashaddr,
        value: 1000,
        unit: "satoshis",
      },
    ])}, 1000);

    await request(app)
      .ws('/wallet')
      .sendJson({ method: "waitForTransaction", data: { cashaddr: alice }})
      .expectJson((actual) => (actual !== undefined && actual.hash !== undefined))
      .close()
      .expectClosed();
  });

  test("Test waitForBlock ws method", async () => {
    const aliceWallet = await mainnet.RegTestWallet.fromId(aliceWif);

    const height = await aliceWallet.provider.getBlockHeight();

    setTimeout(
      async () => await mainnet.mine({ cashaddr: aliceWallet.cashaddr, blocks: 1 }),
      2000
    );
    await request(app)
      .ws('/wallet')
      .sendJson({ method: "waitForBlock", data: { height: undefined }})
      .expectJson((actual) => (actual.height === (height + 1)))
      .close()
      .expectClosed();

    setTimeout(
      async () => await mainnet.mine({ cashaddr: aliceWallet.cashaddr, blocks: 1 }),
      2000
    );

    await request(app)
      .ws('/wallet')
      .sendJson({ method: "waitForBlock", data: { height: height + 2 }})
      .expectJson((actual) => (actual.height === (height + 2)))
      .close()
      .expectClosed();
  });

  // slp
  test.skip("Test slpWatchBalance ws method", async () => {
    const aliceWallet = await mainnet.RegTestWallet.fromId(aliceWif);
    const bobWallet = await mainnet.RegTestWallet.newRandom();
    const bobSlp = mainnet.toSlpAddress(bobWallet.cashaddr);

    setTimeout(async () => {
      await aliceWallet.slp.send([
      {
        slpaddr: bobSlp,
        value: 1000,
        tokenId: tokenId,
      },
    ])}, 2000);

    await request(app)
      .ws('/wallet')
      .sendJson({ method: "slpWatchBalance", data: { slpaddr: aliceSlp, tokenId: tokenId }})
      .expectJson((actual) => (Number(actual.value) > 0.1))
      .close()
      .expectClosed();
  });

  test.skip("Test slpWaitForBalance ws method", async () => {
    const aliceWallet = await mainnet.RegTestWallet.fromId(aliceWif);
    const bobWallet = await mainnet.RegTestWallet.newRandom();
    const bobSlp = mainnet.toSlpAddress(bobWallet.cashaddr);

    setTimeout(async () => {
      await aliceWallet.slp.send([
      {
        slpaddr: bobSlp,
        value: 1000,
        tokenId: tokenId,
      },
    ])}, 2000);

    await request(app)
      .ws('/wallet')
      .sendJson({ method: "slpWaitForBalance", data: { slpaddr: bobSlp, value: 500, tokenId: tokenId }})
      .expectJson((actual) => (actual.value >= 500))
      .close()
      .expectClosed();
  });

  test.skip("Test slpWaitForTransaction ws method", async () => {
    const aliceWallet = await mainnet.RegTestWallet.fromId(aliceWif);
    const bobWallet = await mainnet.RegTestWallet.newRandom();
    const bobSlp = mainnet.toSlpAddress(bobWallet.cashaddr);

    setTimeout(async () => {
      await aliceWallet.slp.send([
      {
        slpaddr: bobSlp,
        value: 1000,
        tokenId: tokenId,
      },
    ])}, 2000);

    await request(app)
      .ws('/wallet')
      .sendJson({ method: "slpWaitForTransaction", data: { slpaddr: aliceSlp, tokenId: tokenId }})
      .expectJson((actual) => (actual !== undefined && actual.tx.h !== undefined))
      .close()
      .expectClosed();
  });
});
