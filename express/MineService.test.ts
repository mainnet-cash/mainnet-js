import { getServer } from "../generated/serve/index";
import * as mockApi from "../generated/client/typescript-mock/api";

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
   * test mining blocks
   */
  it("Should mine a number of blocks to a given address", async () => {
    const bobsWalletResp = await request(app).post("/v1/wallet/create").send({
      name: "Bobs Regtest One Time Wallet",
      type: mockApi.WalletRequest.TypeEnum.Wif,
      network: mockApi.WalletRequest.NetworkEnum.Regtest,
    });

    const bobsCashaddr = bobsWalletResp.body.cashaddr;
    const resp = await request(app).post("/v1/mine").send({
      cashaddr: bobsCashaddr,
      blocks: 15,
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const bobBalanceResp = await request(app).post("/v1/wallet/balance").send({
      walletId: bobsWalletResp.body.walletId,
    });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.length).toEqual(15);
    expect(bobBalanceResp.body.bch).toBeGreaterThanOrEqual(50 * 15);
  });
});
