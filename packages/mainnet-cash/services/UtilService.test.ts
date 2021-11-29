var mainnet = require("mainnet-js");
var server = require("../")
var request = require("supertest");
var app;

describe("Test Util Endpoints", () => {

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
  it("Should convert an amount from usd to bch", async () => {
    mainnet.Mainnet.ExchangeRate.setupAxiosMock("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=usd", { 'bitcoin-cash': { usd: 666.666 } });
    mainnet.Mainnet.ExchangeRate.setupAxiosMock("https://markets.api.bitcoin.com/live/bitcoin",  { BCH: 666.666 });

    const rate = Number(await mainnet.Mainnet.getUsdRate()).toFixed(2);
    const convertResp = await request(app).post("/util/convert").send({
      value: 1,
      from: "bch",
      to: "usd",
    });
    expect(convertResp.statusCode).toEqual(200);
    expect(convertResp.text).toEqual(rate.toString());
  });



  it("Should convert legacy address", async () => {

    const convertLegacyResp = await request(app).post("/util/convert/legacy").send({
      legacyAddress: "3NFvYKuZrxTDJxgqqJSfouNHjT1dAG1Fta",
    });
    expect(convertLegacyResp.statusCode).toEqual(200);
    expect(convertLegacyResp.text).toEqual("bitcoincash:prseh0a4aejjcewhc665wjqhppgwrz2lw5txgn666a");
  });
});
