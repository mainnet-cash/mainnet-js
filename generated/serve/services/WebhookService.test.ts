var mainnet = require("mainnet-js");
var server = require("../")
var request = require("supertest");

var app;

describe("Test Webhook Endpoints", () => {
  beforeAll(async function () {
    app = await server.getServer().launch();
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
        url: 'http://example.com/',
        type: 'balance'
      });
    expect(resp.statusCode).toEqual(200);
    expect(resp.body!.id).toBeGreaterThan(0);
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
