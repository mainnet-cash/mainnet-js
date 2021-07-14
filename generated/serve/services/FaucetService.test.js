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
    const random = await mainnet.TestNetWallet.newRandom();
    // FIXME: we do not have gspp testnet yet
    if (random.slp.provider instanceof mainnet.GsppProvider) {
      console.warn("we do not have gspp testnet yet");
      return;
    }

    // let resp = await request(app).post("/faucet/get_testnet_bch/").send({
    //   cashaddr: ""
    // });

    // expect(resp.statusCode).toEqual(405);
    // expect(resp.body.message).toBe("Incorrect cashaddr");

    const wallet = await mainnet.TestNetWallet.fromWIF(config.FAUCET_WIF);
    const bobwallet = await mainnet.TestNetWallet.newRandom();
    resp = await request(app).post("/faucet/get_testnet_bch/").send({
      cashaddr: bobwallet.cashaddr
    });

    if (resp.statusCode !== 200) console.log(resp.body);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.txId.length).toBe(64);

    const balance = await bobwallet.getBalance("sat");
    expect(balance).toBe(10000);

    resp = await request(app).post("/faucet/get_testnet_bch/").send({
      cashaddr: bobwallet.cashaddr
    });

    expect(resp.statusCode).toEqual(405);
    expect(resp.body.message).toBe("You have 10000 sats or more. Refusing to refill.");

    await bobwallet.slpAware().sendMax(wallet.cashaddr);
  });

  it("Should send testnet slp tokens to recepient", async () => {
    const random = await mainnet.TestNetWallet.newRandom();
    // FIXME: we do not have gspp testnet yet
    if (random.slp.provider instanceof mainnet.GsppProvider) {
      console.warn("we do not have gspp testnet yet");
      return;
    }

    const tokenId = "132731d90ac4c88a79d55eae2ad92709b415de886329e958cf35fdd81ba34c15";

    let resp = await request(app).post("/faucet/get_testnet_slp/").send({
      slpaddr: "",
      tokenId: ""
    });

    expect(resp.statusCode).toEqual(405);
    expect(resp.body.message).toBe("Incorrect slpaddr");

    const wallet = await mainnet.TestNetWallet.fromWIF(config.FAUCET_SLP_WIF);
    const bobwallet = await mainnet.TestNetWallet.newRandom();
    resp = await request(app).post("/faucet/get_testnet_slp/").send({
      slpaddr: bobwallet.slp.slpaddr,
      tokenId: tokenId
    });

    if (resp.statusCode !== 200) console.log(resp.body);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.txId.length).toBe(64);

    const balance = await bobwallet.slp.getBalance(tokenId);
    expect(balance.value.toNumber()).toBe(10);

    // give bob some 'gas' bch to send his slp transaction
    await wallet.slpAware().send([{cashaddr: bobwallet.cashaddr, value: 3000, unit: "sat"}]);
    resp = await request(app).post("/faucet/get_testnet_slp/").send({
      slpaddr: bobwallet.slp.slpaddr,
      tokenId: tokenId
    });

    expect(resp.statusCode).toEqual(405);
    expect(resp.body.message).toBe("You have 10 tokens or more of this type. Refusing to refill.");

    // return tokens to faucet
    await bobwallet.slp.sendMax(wallet.slp.slpaddr, tokenId);
    // return 'gas'
    await bobwallet.slpAware().sendMax(wallet.cashaddr);
  });

  it("Should get faucet addresses", async () => {
    let resp = await request(app).post("/faucet/get_addresses/").send({});

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.bchtest).toBe(config.FAUCET_CASHADDR);
    expect(resp.body.slptest).toBe(config.FAUCET_SLP_CASHADDR);
  });
});
