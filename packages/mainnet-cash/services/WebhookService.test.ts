import * as mainnet from "mainnet-js";
import { Webhook } from "@mainnet-cash/postgresql-storage";
import server from "../";
import request from "supertest";
import { checkResponse } from "../utils/testUtils";

var app;

describe("Test Webhook Endpoints", () => {
  beforeAll(async function () {
    app = await server.getServer().launch();
    Webhook.debug.setupAxiosMocks();
  });

  beforeEach(function () {
    Webhook.debug.reset();
  });

  afterAll(async function () {
    await server.killElectrum()
    app.close();
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

    checkResponse(resp);
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
    expect(Webhook.debug.responses["http://example.com/balance"].length).toBe(1);
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
    checkResponse(resp);
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
    expect(Webhook.debug.responses["http://example.com/transaction"].length).toBe(1);
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
