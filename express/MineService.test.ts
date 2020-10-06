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
   * test mining blocks
   */
  it("Should return true from the readiness indicator", async () => {
    const bobsWalletResp = await request(app).post("/v1/wallet/create").send({
      name: "Bobs Regtest One Time Wallet",
      type: mockApi.WalletRequest.TypeEnum.Wif,
      network: mockApi.WalletRequest.NetworkEnum.Regtest,
    });

    const bobsCashaddr = bobsWalletResp.body.cashaddr;
    const resp = await request(app).get("/mine").send({
      cashaddr: bobsCashaddr,
      blocks: 1,
    });

    const bobBalanceResp = await request(app).post("/v1/wallet/balance").send({
      walletId: bobsWalletResp.body.walletId,
    });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.length).toEqual(1);
    console.log(resp.body);
    expect(bobBalanceResp.body.bch).toEqual(50);
  });
});
