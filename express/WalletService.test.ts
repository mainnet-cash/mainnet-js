import { getServer } from "../generated/serve/index";
import * as mockApi from "../generated/client/typescript-mock/api";
import { bchParam } from "../src/chain";
import { SendRequest } from "../generated/client/typescript-mock/model/sendRequest";
import { SendRequestItem } from "../generated/client/typescript-mock/model/sendRequestItem";
import {
  UtxoResponse,
  UnitType,
} from "../generated/client/typescript-mock/api";

var request = require("supertest");

var app;

describe("Post Endpoints", () => {
  beforeAll(async function () {
    app = await getServer().launch();
  });
  afterEach(function () {
    app.close();
  });

  /**
   * ready
   */
  it("Should return true from the readiness indicator", async () => {
    const resp = await request(app).get("/ready").send();
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.status).toEqual("okay");
  });

  /**
   * redirect to docs
   */
  it("Should return true from the readiness indicator", async () => {
    const resp = await request(app).get("/").send();
    expect(resp.statusCode).toEqual(301);
  });

  /**
   * serve docs
   */
  it("Should return swagger doc UI from root url", async () => {
    const resp = await request(app).get("/api-docs/").send();
    expect(resp.statusCode).toEqual(200);
    expect(resp.text.slice(0, 391)).toEqual(
      `\n<!-- HTML for static distribution bundle build -->\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Swagger UI</title>\n  <link rel="stylesheet" type="text/css" href="./swagger-ui.css" >\n  <link rel="icon" type="image/png" href="./favicon-32x32.png" sizes="32x32" /><link rel="icon" type="image/png" href="./favicon-16x16.png" sizes="16x16" />\n  \n  <style>\n    html\n`
    );
  });

  /**
   * balance
   */
  it("Should return the balance from a regtest wallet", async () => {
    const resp = await request(app)
      .post("/v1/wallet/balance")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      });
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.sat).toBeGreaterThan(100);
    expect(resp.body.bch).toBeGreaterThanOrEqual(5000);
  });

  /**
   * balance in satoshi
   */
  it("Should return the balance from a regtest wallet in satoshi", async () => {
    const resp = await request(app)
      .post("/v1/wallet/balance")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        unit: "sat",
      });
    expect(resp.statusCode).toEqual(200);
    expect(parseInt(resp.text)).toBeGreaterThanOrEqual(
      5000 * bchParam.subUnits
    );
  });

  /**
   * createWallet
   */
  it("Should create a Regtest wallet form the API", async () => {
    let req = new mockApi.WalletRequest();
    req.name = "A simple Regtest Wallet";
    req.type = mockApi.WalletRequest.TypeEnum.Wif;
    req.network = mockApi.WalletRequest.NetworkEnum.Regtest;
    let resp = await request(app).post("/v1/wallet/create").send(req);
    const body = resp.body;
    expect(resp.statusCode).toBe(200);
    expect(body!.name).toBe(req.name);
    expect(body!.network).toBe(req.network);
    expect(body!.cashaddr!.startsWith("bchreg:")).toBeTruthy();
    expect(body!.walletId!.startsWith("wif:regtest:3")).toBeTruthy();
  });

  it("Should create a Testnet wallet with the API", async () => {
    let req = new mockApi.WalletRequest();
    req.name = "A simple Testnet Wallet";

    req.type = mockApi.WalletRequest.TypeEnum.Wif;
    req.network = mockApi.WalletRequest.NetworkEnum.Testnet;

    let resp = await request(app).post("/v1/wallet/create").send(req);
    const body = resp.body;
    expect(resp.statusCode).toBe(200);
    expect(body!.name).toBe(req.name);
    expect(body!.network).toBe(req.network);
    expect(body!.cashaddr!.startsWith("bchtest:")).toBeTruthy();
    expect(body!.walletId!.startsWith("wif:testnet:3")).toBeTruthy();
  });

  it("Should create a Mainnet wallet with the API", async () => {
    let req = new mockApi.WalletRequest();
    req.name = "A simple Mainnet Wallet";
    req.type = mockApi.WalletRequest.TypeEnum.Wif;
    req.network = mockApi.WalletRequest.NetworkEnum.Mainnet;

    let resp = await request(app).post("/v1/wallet/create").send(req);
    const body = resp.body;

    expect(resp.statusCode).toBe(200);
    expect(body!.name).toBe(req.name);
    expect(body!.network).toBe(req.network);
    expect(body!.cashaddr!.startsWith("bitcoincash:")).toBeTruthy();
    expect(body!.walletId!.startsWith("wif:mainnet:2")).toBeTruthy();
  });

  it("Should create a mainnet wallet on empty request", async () => {
    let req = new mockApi.WalletRequest();

    let resp = await request(app).post("/v1/wallet/create").send(req);
    const body = resp.body;

    expect(resp.statusCode).toBe(200);
    expect(body!.name).toBe("");
    expect(body!.network).toBe("mainnet");
    expect(body!.cashaddr!.startsWith("bitcoincash:")).toBeTruthy();
    expect(body!.walletId!.startsWith("wif:mainnet:2")).toBeTruthy();
  });

  /**
   * depositAddress
   */

  it("Should return the deposit address from a regtest wallet", async () => {
    let resp = await request(app).post("/v1/wallet/deposit_address").send({
      walletId:
        "wif:regtest:3h4GVWszSE9WD4WUoQCGtphK1XMS8771ZmABfeGWc44iZbSna5D7Yi",
    });
    expect(resp.statusCode).toBe(200);
    expect(resp.body.cashaddr).toBe(
      "bchreg:qp3t43vq3xnxdfuge4l4q4ndehkn48uexghagrwwx5"
    );
  });

  /**
   * depositQr
   */
  it("Should get the deposit qr from a regtest wallet", async () => {
    let resp = await request(app).post("/v1/wallet/deposit_qr").send({
      walletId:
        "wif:regtest:3h4GVWszSE9WD4WUoQCGtphK1XMS8771ZmABfeGWc44iZbSna5D7Yi",
    });
    const body = resp.body;

    expect(resp.statusCode).toBe(200);
    expect(
      body!.src!.startsWith("data:image/svg+xml;base64,PD94bWwgdm")
    ).toBeTruthy();
  });

  /**
   * maxAmountToSend
   */
  it("Should accept a max amount to send request for a regtest wallet", async () => {
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      const bobsWalletResp = await request(app).post("/v1/wallet/create").send({
        name: "Bobs Regtest One Time Wallet",
        type: mockApi.WalletRequest.TypeEnum.Wif,
        network: mockApi.WalletRequest.NetworkEnum.Regtest,
      });

      const bobsCashaddr = bobsWalletResp.body.cashaddr;

      const sendResp = await request(app)
        .post("/v1/wallet/send")
        .send({
          walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
          to: [
            {
              cashaddr: bobsCashaddr,
              unit: UnitType.UnitEnum.Sat,
              value: 120000,
            },
          ],
        });

      let resp = await request(app).post("/v1/wallet/max_amount_to_send").send({
        walletId: bobsWalletResp.body.walletId,
      });
      const body = resp.body;
      expect(resp.statusCode).toBe(200);
      expect(body!.sat).toBeGreaterThan(110000);
    }
  });

  /**
   * send
   */

  test("Should send from a Regtest wallet with the API", async () => {
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      const bobsWalletResp = await request(app).post("/v1/wallet/create").send({
        name: "Bobs Regtest One Time Wallet",
        type: mockApi.WalletRequest.TypeEnum.Wif,
        network: mockApi.WalletRequest.NetworkEnum.Regtest,
      });
      const bobsCashaddr = bobsWalletResp.body.cashaddr;

      let toBob = new SendRequestItem();
      toBob.cashaddr = bobsCashaddr;
      toBob.unit = UnitType.UnitEnum.Sat;
      toBob.value = 3000;

      let AliceSendToBobReq = new SendRequest();
      AliceSendToBobReq.walletId = `wif:regtest:${process.env.PRIVATE_WIF}`;
      AliceSendToBobReq.to = [toBob];

      const sendResp = await request(app)
        .post("/v1/wallet/send")
        .send(AliceSendToBobReq);

      const resp = await request(app).post("/v1/wallet/balance").send({
        walletId: bobsWalletResp.body.walletId,
      });

      const body = resp.body;

      expect(bobsWalletResp.statusCode).toBe(200);
      expect(sendResp.statusCode).toBe(200);
      expect((sendResp.body.transactionId as string).length).toBe(64);
      expect(resp.statusCode).toBe(200);
      expect(body.sat as number).toBe(3000);
    }
  });

  /**
   * sendMax
   */

  it("Should send all available funds", async () => {
    let bobWalletReq = new mockApi.WalletRequest();
    bobWalletReq.name = "A Bobs Regtest Wallet";
    bobWalletReq.type = mockApi.WalletRequest.TypeEnum.Wif;
    bobWalletReq.network = mockApi.WalletRequest.NetworkEnum.Regtest;

    const bobsWalletResp = await request(app)
      .post("/v1/wallet/create")
      .send(bobWalletReq);
    const bobsWallet = bobsWalletResp.body;

    let toBob = new SendRequestItem();
    toBob.cashaddr = bobsWallet.cashaddr as string;
    toBob.unit = UnitType.UnitEnum.Bch;
    toBob.value = 1;

    let AliceSendToBobReq = new SendRequest();
    AliceSendToBobReq.walletId = `wif:regtest:${process.env.PRIVATE_WIF}`;
    AliceSendToBobReq.to = [toBob];

    await request(app).post("/v1/wallet/send").send(AliceSendToBobReq);

    let resp = await request(app)
      .post("/v1/wallet/send_max")
      .send({
        walletId: bobsWallet.walletId,
        cashaddr: process.env.ADDRESS as string,
      });
    const body = resp.body;
    if (resp.statusCode !== 200) {
      console.log(resp.error.text);
    }
    expect(resp.statusCode).toBe(200);
    expect((body.transactionId as string).length).toBe(64);
    expect(body.balance!.bch as number).toBe(0);
    expect(body.balance!.sat as number).toBe(0);
  });
  /**
   * utxos
   */
  it("Should return the unspent transaction outputs for a regtest wallet", async () => {
    const resp = await request(app)
      .post("/v1/wallet/utxo")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      });

    const body = resp.body as UtxoResponse;
    if (body.utxos) {
      const valueArray = await Promise.all(
        body.utxos.map(async (b) => {
          return b!.value || 0;
        })
      );
      const value = valueArray.reduce((a, b) => a + b, 0);
      expect(resp.statusCode).toBe(200);
      expect(value).toBeGreaterThan(490 * bchParam.subUnits);
      expect(body!.utxos!.length).toBeGreaterThan(100);
    } else {
      throw Error("no utxos returned");
    }
  });
});
