var server = require("../")

var request = require("supertest");
var mainnet = require("mainnet-js");
var smartbch = require("@mainnet-cash/smartbch");
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
   * test bch faucet 
   */
  it("Should send testnet bch to recepient", async () => {
    const random = await mainnet.TestNetWallet.newRandom();
    
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

  });


  /**
   * test faucet error
   */
   it("Should refuse to send coins to address over 10000 balance ", async () => {
    const random = await mainnet.TestNetWallet.newRandom();
    
    const wallet = await mainnet.TestNetWallet.fromWIF(config.FAUCET_WIF);
    const bobwallet = await mainnet.TestNetWallet.newRandom();
    resp = await request(app).post("/faucet/get_testnet_bch/").send({
      cashaddr: bobwallet.cashaddr
    });

    if (resp.statusCode !== 200) console.log(resp.body);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.txId.length).toBe(64);

    const balance = await bobwallet.getBalance("sat");

    resp = await request(app).post("/faucet/get_testnet_bch/").send({
      cashaddr: bobwallet.cashaddr
    });

    expect(resp.statusCode).toEqual(405);
    expect(resp.body.message).toBe("You have 10000 sats or more. Refusing to refill.");

    await bobwallet.slpAware().sendMax(wallet.cashaddr);
  });

    /**
   * test faucet to invalid address
   */
     it("Should error sending testnet bch to invalid address", async () => {
      const random = await mainnet.TestNetWallet.newRandom();
        
      let resp = await request(app).post("/faucet/get_testnet_bch/").send({
        cashaddr: ""
      });
  
      expect(resp.statusCode).toEqual(405);
      expect(resp.body.message).toBe("Incorrect cashaddr");
  
    });

    // FIXME: possible issue with testnet tooling upgrade for May 15th?
    // it("Should send testnet slp tokens to recepient", async () => {
    //   const random = await mainnet.TestNetWallet.newRandom();
    //   // FIXME: we do not have gspp testnet yet
    //   if (random.slp.provider instanceof mainnet.GsppProvider) {
    //     console.warn("we do not have gspp testnet yet");
    //     return;
    //   }

    //   const tokenId = "132731d90ac4c88a79d55eae2ad92709b415de886329e958cf35fdd81ba34c15";

    //   let resp = await request(app).post("/faucet/get_testnet_slp/").send({
    //     slpaddr: "",
    //     tokenId: ""
    //   });

    //   expect(resp.statusCode).toEqual(405);
    //   expect(resp.body.message).toBe("Incorrect slpaddr");

    //   const wallet = await mainnet.TestNetWallet.fromWIF(config.FAUCET_SLP_WIF);
    //   const bobwallet = await mainnet.TestNetWallet.newRandom();
    //   resp = await request(app).post("/faucet/get_testnet_slp/").send({
    //     slpaddr: bobwallet.slp.slpaddr,
    //     tokenId: tokenId
    //   });

    //   if (resp.statusCode !== 200) console.log(resp.body);
    //   expect(resp.statusCode).toEqual(200);
    //   expect(resp.body.txId.length).toBe(64);

    //   const balance = await bobwallet.slp.getBalance(tokenId);
    //   expect(balance.value.toNumber()).toBe(10);

    //   // give bob some 'gas' bch to send his slp transaction
    //   await wallet.slpAware().send([{cashaddr: bobwallet.cashaddr, value: 3000, unit: "sat"}]);
    //   resp = await request(app).post("/faucet/get_testnet_slp/").send({
    //     slpaddr: bobwallet.slp.slpaddr,
    //     tokenId: tokenId
    //   });

    //   expect(resp.statusCode).toEqual(405);
    //   expect(resp.body.message).toBe("You have 10 tokens or more of this type. Refusing to refill.");

    //   // return tokens to faucet
    //   await bobwallet.slp.sendMax(wallet.slp.slpaddr, tokenId);
    //   // return 'gas'
    //   await bobwallet.slpAware().sendMax(wallet.cashaddr);
    // });

  it("Should send testnet SmartBch to recepient", async () => {
    let resp = await request(app).post("/faucet/get_testnet_sbch/").send({
      address: ""
    });

    expect(resp.statusCode).toEqual(405);
    expect(resp.body.message).toBe("Incorrect SmartBch address");

    const wallet = await smartbch.TestNetSmartBchWallet.fromPrivateKey(config.FAUCET_SBCH_PRIVKEY);
    const bobwallet = await smartbch.TestNetSmartBchWallet.newRandom();
    const charliewallet = await smartbch.TestNetSmartBchWallet.newRandom();
    resp = await Promise.all([
      request(app).post("/faucet/get_testnet_sbch/").send({
        address: bobwallet.getDepositAddress()
      }),
      request(app).post("/faucet/get_testnet_sbch/").send({
        address: charliewallet.getDepositAddress()
      }),
      request(app).post("/faucet/get_testnet_sbch/").send({
        address: charliewallet.getDepositAddress()
      })
    ]);
    expect(resp[0].body.success).toBe(true);
    expect(resp[1].body.success).toBe(true);
    expect(resp[2].body.success).toBe(true);

    await mainnet.delay(30000);
    expect(await bobwallet.getBalance("bch")).toBe(0.1);
    expect(await charliewallet.getBalance("bch")).toBe(0.1);

    resp = await request(app).post("/faucet/get_testnet_sbch/").send({
      address: bobwallet.getDepositAddress()
    });

    expect(resp.statusCode).toEqual(405);
    expect(resp.body.message).toBe("You have 0.1 BCH or more. Refusing to refill.");

    await bobwallet.sendMax(wallet.getDepositAddress(), {}, { gasPrice: 10 ** 10 });
    await charliewallet.sendMax(wallet.getDepositAddress(), {}, { gasPrice: 10 ** 10 });
  });

  it("Should send testnet SmartBch SEP20 tokens to recepient", async () => {
    const tokenId = config.FAUCET_SBCH_TOKEN_ID;

    let resp = await request(app).post("/faucet/get_testnet_sep20/").send({
      address: "",
      tokenId: ""
    });

    expect(resp.statusCode).toEqual(405);
    expect(resp.body.message).toBe("Incorrect SmartBch address");

    const wallet = await smartbch.TestNetSmartBchWallet.fromPrivateKey(config.FAUCET_SBCH_PRIVKEY);
    const bobwallet = await smartbch.TestNetSmartBchWallet.newRandom();
    resp = await request(app).post("/faucet/get_testnet_sep20/").send({
      address: bobwallet.getDepositAddress(),
      tokenId: tokenId
    });

    if (resp.statusCode !== 200) console.log(resp.body);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.success).toBe(true);

    await mainnet.delay(20000);

    const balance = await bobwallet.sep20.getBalance(tokenId);
    expect(balance.value.toNumber()).toBe(10);

    // give bob some 'gas' bch to send his sep20 transaction
    await wallet.send([{address: bobwallet.getDepositAddress(), value: 300000, unit: "sat"}], {}, { gasPrice: 10 ** 10 });
    resp = await request(app).post("/faucet/get_testnet_sep20/").send({
      address: bobwallet.getDepositAddress(),
      tokenId: tokenId,
    });

    expect(resp.statusCode).toEqual(405);
    expect(resp.body.message).toBe("You have 10 tokens or more of this type. Refusing to refill.");

    // return tokens to faucet
    await bobwallet.sep20.sendMax(wallet.getDepositAddress(), tokenId, { gasPrice: 10 ** 10 });
    // return 'gas'
    await bobwallet.sendMax(wallet.getDepositAddress(), {}, { gasPrice: 10 ** 10 });
  });

  it("Should get faucet addresses", async () => {
    let resp = await request(app).post("/faucet/get_addresses/").send({});

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.bchtest).toBe(config.FAUCET_CASHADDR);
    expect(resp.body.slptest).toBe(config.FAUCET_SLP_CASHADDR);
    expect(resp.body.sbchtest).toBe(config.FAUCET_SBCH_ADDRESS);
    expect(resp.body.sbchcontract).toBe(config.FAUCET_SBCH_CONTRACT_ADDRESS);
    expect(resp.body.sbchtoken).toBe(config.FAUCET_SBCH_TOKEN_ID);
  });
});
