import axios from "axios";

var mainnet = require("mainnet-js");
var server = require("../")
var request = require("supertest");

var app;
var responses = {};

describe("Test Webhook Endpoints", () => {
  beforeAll(async function () {
    app = await server.getServer().launch();

    axios.interceptors.request.use((config) => {
      if (config.url!.indexOf("example.com")) {
        config.url = "x" + config.url!;
      }
      return config;
    });

    axios.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        let url = error.config.url!.slice(1);

        if (url in responses) {
          responses[url].push(error);
        } else {
          responses[url] = [error];
        }

        if (url === "http://example.com/fail")
          return Promise.reject({ status: 503 });

        return Promise.resolve({ status: 200 });
      }
    );
  });

  beforeEach(function () {
    responses = {};
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
    if (resp.statusCode !== 200) {
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

    await delay(1000);
    expect(responses["http://example.com/balance"].length).toBe(1);
  });

  it("Should register a transaction watch webhook", async () => {
    let bobWallet = await mainnet.RegTestWallet.newRandom();

    const resp = await request(app)
      .post("/webhook/watch_address")
      .send({
        cashaddr: bobWallet.cashaddr,
        url: 'http://example.com/',
        type: 'transaction:in'
      });
    if (resp.statusCode !== 200) {
      console.log(resp.error.text);
    }
    expect(resp.statusCode).toEqual(200);
    expect(resp.body!.id).toBeGreaterThan(0);
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
