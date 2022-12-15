import * as mainnet from "mainnet-js";
import server from "../";
import request from "supertest";

var app;
let tokenId;

const serversSlpDb = { ...{}, ...mainnet.SlpDbProvider.defaultServers };
const serversGspp = { ...{}, ...mainnet.GsppProvider.defaultServers };

describe("Test Webhook Endpoints", () => {
  beforeAll(async function () {
    app = await server.getServer().launch();
    mainnet.Webhook.debug.setupAxiosMocks();
    // const genesisOptions = {
    //   name: "Webhook REST Service Token",
    //   ticker: "WHTR",
    //   decimals: 2,
    //   initialAmount: 10000,
    //   documentUrl: "https://mainnet.cash",
    //   documentHash:
    //     "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    // };
    // mainnet.SlpDbProvider.defaultServers.testnet = mainnet.SlpDbProvider.defaultServers.regtest;
    // mainnet.GsppProvider.defaultServers.testnet = mainnet.GsppProvider.defaultServers.regtest;
    // const aliceWallet = await mainnet.RegTestWallet.slp.fromId(`wif:regtest:${process.env.PRIVATE_WIF!}`);
    // const genesisResult = await aliceWallet.slp.genesis(genesisOptions);
    // tokenId = genesisResult.tokenId;
  });

  beforeEach(function () {
    mainnet.Webhook.debug.reset();
  });

  afterAll(async function () {
    await server.killElectrum()
    app.close();

    mainnet.SlpDbProvider.defaultServers = serversSlpDb;
    mainnet.GsppProvider.defaultServers = serversGspp;
  });

  /**
   * balance
   */
  it("Should register a balance watch webhook", async () => {
    let bobWallet = await mainnet.RegTestWallet.newRandom();

    const resp = await request(app)
      .post("/webhook/watch_address")
      .send({
        cashaddr: bobWallet.cashaddr,
        url: 'http://example.com/balance',
        type: 'balance'
      });
    if (resp.error) {
      console.log(resp.error.text);
    }

    expect(resp.statusCode).toEqual(200);
    expect(resp.body!.id).toBeGreaterThan(0);

    await request(app)
      .post("/wallet/send")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF!}`,
        to: [
          {
            cashaddr: bobWallet.cashaddr!,
            unit: 'satoshis',
            value: 2000,
          },
        ],
      });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(mainnet.Webhook.debug.responses["http://example.com/balance"].length).toBe(1);
  });

  it("Should register a transaction watch webhook", async () => {
    let bobWallet = await mainnet.RegTestWallet.newRandom();

    const resp = await request(app)
      .post("/webhook/watch_address")
      .send({
        cashaddr: bobWallet.cashaddr,
        url: 'http://example.com/transaction',
        type: 'transaction:in'
      });
    if (resp.error) {
      console.log(resp.error.text);
    }
    expect(resp.statusCode).toEqual(200);
    expect(resp.body!.id).toBeGreaterThan(0);

    await request(app)
      .post("/wallet/send")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF!}`,
        to: [
          {
            cashaddr: bobWallet.cashaddr!,
            unit: 'satoshis',
            value: 2000,
          },
        ],
      });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(mainnet.Webhook.debug.responses["http://example.com/transaction"].length).toBe(1);
  });

  /**
   * slpbalance
   */
   it("Should register an SLP balance watch webhook", async () => {
    let bobWallet = await mainnet.RegTestWallet.newRandom();

    const resp = await request(app)
      .post("/webhook/watch_address")
      .send({
        cashaddr: bobWallet.cashaddr,
        url: 'http://example.com/slpbalance',
        type: 'slpbalance',
        tokenId: tokenId
      });
    if (resp.error) {
      console.log(resp.error.text);
    }
    expect(resp.statusCode).toEqual(200);
    expect(resp.body!.id).toBeGreaterThan(0);

    await request(app)
      .post("/wallet/slp/send")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF!}`,
        to: [
          {
            slpaddr: bobWallet.slp.slpaddr,
            tokenId: tokenId,
            value: 2000,
          },
        ],
      });

    await new Promise((resolve) => setTimeout(resolve, 5000));
    expect(mainnet.Webhook.debug.responses["http://example.com/slpbalance"].length).toBe(1);
  });

  it("Should register an SLP transaction watch webhook", async () => {
    let bobWallet = await mainnet.RegTestWallet.newRandom();

    const resp = await request(app)
      .post("/webhook/watch_address")
      .send({
        cashaddr: bobWallet.cashaddr,
        url: 'http://example.com/slptransaction',
        type: 'slptransaction:in',
        tokenId: tokenId
      });
    if (resp.error) {
      console.log(resp.error.text);
    }
    expect(resp.statusCode).toEqual(200);
    expect(resp.body!.id).toBeGreaterThan(0);

    await request(app)
      .post("/wallet/slp/send")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF!}`,
        to: [
          {
            slpaddr: bobWallet.slp.slpaddr,
            tokenId: tokenId,
            value: 2000,
          },
        ],
      });

    await new Promise((resolve) => setTimeout(resolve, 5000));
    expect(mainnet.Webhook.debug.responses["http://example.com/slptransaction"].length).toBe(1);
  });

  it("Should fail register a webhook of unknown type", async () => {
    let bobWallet = await mainnet.RegTestWallet.newRandom();

    const resp = await request(app)
      .post("/webhook/watch_address")
      .send({
        cashaddr: bobWallet.cashaddr,
        url: 'http://example.com/',
        type: 'test'
      });
    expect(resp.statusCode).not.toEqual(200);
  });
});
