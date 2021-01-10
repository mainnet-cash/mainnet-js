var server = require("../")

var request = require("supertest");
var mainnet = require("mainnet-js");
var config  = require('../config');

var app;

describe("Test faucet endpoints", () => {

  beforeAll(async function () {
    app = await server.getServer().launch();
  });
  afterAll(async function () {
    await server.killElectrum()
    app.close();
  });

  /**
   * test mining blocks
   */
  it("Should send testnet bch to recepient", async () => {
    let resp = await request(app).post("/faucet/get_testnet_bch/").send({
      cashaddr: ""
    });

    expect(resp.statusCode).toEqual(405);
    expect(resp.body.message).toBe("Incorrect cashaddr");

    const wallet = await mainnet.TestNetWallet.fromWIF(config.FAUCET_WIF);
    const bobwallet = await mainnet.TestNetWallet.newRandom();
    resp = await request(app).post("/faucet/get_testnet_bch/").send({
      cashaddr: bobwallet.cashaddr
    });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.txId.length).toBe(64);

    const balance = await bobwallet.getBalance("sat");
    expect(balance).toBe(10000);

    resp = await request(app).post("/faucet/get_testnet_bch/").send({
      cashaddr: bobwallet.cashaddr
    });

    expect(resp.statusCode).toEqual(405);
    expect(resp.body.message).toBe("You have 10000 sats or more. Refusing to refill.");

    await bobwallet.sendMax(wallet.cashaddr);
  });

  it("Should send testnet slp tokens to recepient", async () => {
    const ticker = "MNC";
    const tokenId = "132731d90ac4c88a79d55eae2ad92709b415de886329e958cf35fdd81ba34c15";

    let resp = await request(app).post("/faucet/get_testnet_slp/").send({
      cashaddr: "",
      ticker: ""
    });

    expect(resp.statusCode).toEqual(405);
    expect(resp.body.message).toBe("Incorrect cashaddr");

    const wallet = await mainnet.TestNetWallet.fromWIF(config.FAUCET_SLP_WIF);
    const bobwallet = await mainnet.TestNetWallet.newRandom();
    resp = await request(app).post("/faucet/get_testnet_slp/").send({
      cashaddr: bobwallet.cashaddr,
      ticker: ticker,
      tokenId: tokenId
    });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.txId.length).toBe(64);

    const balance = await bobwallet.slp.getBalance(ticker, tokenId);
    expect(balance.length).toBe(1);
    expect(balance[0].amount.toNumber()).toBe(10);

    // give bob some 'gas' bch to send his slp transaction
    await wallet.slpAware().send([{cashaddr: bobwallet.cashaddr, value: 3000, unit: "sat"}]);
    resp = await request(app).post("/faucet/get_testnet_slp/").send({
      cashaddr: bobwallet.cashaddr,
      ticker: ticker,
      tokenId: tokenId
    });

    expect(resp.statusCode).toEqual(405);
    expect(resp.body.message).toBe("You have 10 tokens or more of this type. Refusing to refill.");

    // return tokens to faucet
    await bobwallet.slp.send([{cashaddr: wallet.slp.cashaddr, value: 10, ticker: ticker, tokenId: tokenId}]);
    // return 'gas'
    await bobwallet.slpAware(false).sendMax(wallet.cashaddr);
  });

  it("Should get faucet addresses", async () => {
    let resp = await request(app).post("/faucet/get_addresses/").send({
    });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.bchtest).toBe(config.FAUCET_CASHADDR);
    expect(resp.body.slptest).toBe(config.FAUCET_SLP_CASHADDR);
  });
});
