
import { bchParam } from "../../../src/chain";

var server = require("../")
var request = require("supertest");
var bchaddr = require('bchaddrjs-slp');

var app;

describe("Test Wallet Slp Endpoints", () => {
  beforeAll(async function () {
    app = await server.getServer().launch();
  });
  afterAll(async function () {
    await server.killElectrum()
    app.close();
  });

  /**
   * genesis
   */
  it("Should create a new token", async () => {
    const resp = await request(app)
      .post("/wallet/slp/genesis")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        name: "Mainnet coin",
        ticker: "MNC",
        initialAmount: "10000",
        decimalPlaces: 2,
        documentUrl: "https://mainnet.cash",
        documentHash: "db4451f11eda33950670aaf59e704da90117ff7057283b032cfaec7779313916",
        endBaton: false
      });
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.tokenId.length).toBe(64);
    expect(resp.body.balances.length).toBe(1);
    expect(resp.body.balances[0].amount.toNumber()).toBe(10000);
  });


  /**
   * balance
   */
  it("Should return the balance from a regtest wallet", async () => {
    const resp = await request(app)
      .post("/wallet/slp/balance")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      });
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.length).toBe(1);
    expect(resp.body[0].amount.toNumber()).toBe(10000);
  });

  /**
   * depositAddress
   */
  it("Should return the deposit address from a regtest wallet", async () => {
    let resp = await request(app).post("/wallet/slp/deposit_address").send({
      walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
    });
    expect(resp.statusCode).toBe(200);
    expect(resp.body.cashaddr).toBe(process.env.ADDRESS);
  });

  /**
   * depositQr
   */
  it("Should get the deposit qr from a regtest wallet", async () => {
    let resp = await request(app).post("/wallet/slp/deposit_qr").send({
      walletId:
        `wif:regtest:${process.env.PRIVATE_WIF}`,
    });
    const body = resp.body;

    expect(resp.statusCode).toBe(200);
    expect(
      body!.src!.slice(0,36)
    ).toBe("data:image/svg+xml;base64,PD94bWwgdm");
  });

  /**
   * send
   */
  test("Should send slp from a Regtest wallet with the API", async () => {
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      const bobsWalletResp = await request(app).post("/wallet/slp/create").send({
        type: "wif",
        network: "regtest",
      });
      const bobsCashaddr = bobsWalletResp.body.cashaddr;

      const sendResp = await request(app)
        .post("/wallet/slp/send")
        .send({
          walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
          to: [{
            cashaddr: bobsCashaddr,
            tocker: "MNC",
            amount: 10
          }]
        });

      const resp = await request(app).post("/wallet/slp/balance").send({
        walletId: bobsWalletResp.body.walletId,
      });

      const body = resp.body;

      expect(bobsWalletResp.statusCode).toBe(200);
      expect(sendResp.statusCode).toBe(200);
      expect((sendResp.body.txId as string).length).toBe(64);
      expect(resp.statusCode).toBe(200);
      expect(body[0].toNumber()).toBe(10);
    }
  });

  /**
   * sendMax
   */

  it("Should send all available slp funds", async () => {
    let bobWalletReq = {
      name:"Bob's Regtest Wallet",
      type:"seed",
      network:"regtest"
    };

    const bobsWalletResp = await request(app)
      .post("/wallet/create")
      .send(bobWalletReq);
    const bobsWallet = bobsWalletResp.body;
    expect(bobsWallet.cashaddr).toMatch(/bchreg:[q|p]\w{41}/)

    // give bob some bch gas
    let initialResp = await request(app).post("/wallet/send").send({
      walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      to: [{
        cashaddr: bobsWallet.cashaddr,
        unit: 'sat',
        value: 3000
      }]
    });
    if (initialResp.statusCode !== 200) {
      console.log(initialResp.error.text);
    }

    let initialSlpResp = await request(app).post("/wallet/slp/send").send({
      walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      to: [{
        cashaddr: bchaddr.toSlpAddress(bobsWallet.cashaddr),
        ticker: "MNC",
        value: 10
      }]
    });
    if (initialSlpResp.statusCode !== 200) {
      console.log(initialSlpResp.error.text);
    }

    let slpResp = await request(app)
      .post("/wallet/slp/send_max")
      .send({
        walletId: bobsWallet.walletId,
        cashaddr: bchaddr.toSlpAddress(process.env.ADDRESS as string),
      });
    const slpBody = slpResp.body;
    if (slpResp.statusCode !== 200) {
      console.log(slpResp.error.text);
    }
    expect(slpResp.statusCode).toBe(200);
    expect((slpBody.txId as string).length).toBe(64);
    expect(slpBody.balances.length).toBe(0);

    let resp = await request(app)
      .post("/wallet/send_max")
      .send({
        walletId: bobsWallet.walletId,
        cashaddr: process.env.ADDRESS as string,
      });
    const body = resp.body;
    if (resp.statusCode !== 200) {
      console.log(resp.error.text);
    }
    expect(resp.statusCode).toBe(200);
    expect((body.txId as string).length).toBe(64);
    expect(body.balance!.bch as number).toBe(0);
    expect(body.balance!.sat as number).toBe(0);
  });
  /**
   * utxos
   */
  it("Should return the unspent transaction outputs for a regtest wallet", async () => {
    const resp = await request(app)
      .post("/wallet/slp/utxo")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      });

    const body = resp.body;
    if (body.utxos) {
      const valueArray = await Promise.all(
        body.utxos.map(async (b) => {
          return b!.value || 0;
        })
      );
      const value = valueArray.reduce((a:any, b:any) => a + b, 0);
      expect(resp.statusCode).toBe(200);
      expect(value).toBeGreaterThan(0);
      expect(body!.utxos!.length).toBeGreaterThan(0);
    } else {
      throw Error("no utxos returned");
    }
  });
});
