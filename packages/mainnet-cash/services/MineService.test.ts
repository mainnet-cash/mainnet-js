import server from "../index.js";

import request from "supertest";

var app;
var express;

describe("Test Mine Endpoints", () => {

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
  it("Should mine a number of blocks to a given address", async () => {
    const bobsWalletResp = await request(app).post("/wallet/create").send({
      type: "wif",
      network: "regtest",
    });

    const bobsCashaddr = "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0";
    const resp = await request(app).post("/mine").send({
      cashaddr: bobsCashaddr,
      blocks: 1,
    });

    await new Promise((resolve) => setTimeout(resolve, 10000));
    await request(app).post("/wallet/balance").send({
      walletId: bobsWalletResp.body.walletId,
    });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.length).toEqual(1);
  });
});
