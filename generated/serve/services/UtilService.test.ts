var server = require("../")

var request = require("supertest");
var mainnet = require("mainnet-js");
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
    const rate = await mainnet.Mainnet.getUsdRate()
    const convertResp = await request(app).post("/util/convert").send({
      value: 1,
      from: "bch",
      to: "usd",
    });
    expect(convertResp.statusCode).toEqual(200);
    expect(convertResp.text).toEqual(rate.toString());
  });
});
