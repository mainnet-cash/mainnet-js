import server from "..";

import request from "supertest";
import * as mainnet from "mainnet-js";
import config  from '../config';
import { checkResponse } from "../utils/testUtils";

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
    const bobwallet = await mainnet.TestNetWallet.newRandom();
    const resp = await request(app).post("/faucet/get_testnet_bch/").send({
      cashaddr: bobwallet.cashaddr
    });

    if (resp.statusCode !== 200) console.log(resp.body);
    checkResponse(resp);
    expect(resp.body.txId.length).toBe(64);

    const balance = await bobwallet.getBalance("sat");
    expect(balance).toBe(10000);

  });


  /**
   * test faucet error
   */
   it("Should refuse to send coins to address over 10000 balance ", async () => {
    const wallet = await mainnet.TestNetWallet.fromWIF(config.FAUCET_WIF!);
    const bobwallet = await mainnet.TestNetWallet.newRandom();
    let resp = await request(app).post("/faucet/get_testnet_bch/").send({
      cashaddr: bobwallet.cashaddr
    });

    if (resp.statusCode !== 200) console.log(resp.body);
    checkResponse(resp);
    expect(resp.body.txId.length).toBe(64);

    resp = await request(app).post("/faucet/get_testnet_bch/").send({
      cashaddr: bobwallet.cashaddr
    });

    expect(resp.statusCode).toEqual(405);
    expect(resp.body.message).toBe("You have 10000 sats or more. Refusing to refill.");

    await bobwallet.slpSemiAware().sendMax(wallet.cashaddr!);
  });

  /**
   * test faucet to invalid address
   */
    it("Should error sending testnet bch to invalid address", async () => {
    let resp = await request(app).post("/faucet/get_testnet_bch/").send({
      cashaddr: ""
    });

    expect(resp.statusCode).toEqual(405);
    expect(resp.body.message).toBe("Incorrect cashaddr");
  });

  it("Should get faucet addresses", async () => {
    let resp = await request(app).post("/faucet/get_addresses/").send({});

    checkResponse(resp);
    expect(resp.body.bchtest).toBe(config.FAUCET_CASHADDR);
  });
});
