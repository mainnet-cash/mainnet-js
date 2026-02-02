import * as mainnet from "mainnet-js";
import { setupFetchMock } from "mainnet-js";
import server from "../";
import request from "supertest";
import { checkResponse } from "../utils/testUtils";
var app;

describe("Test Util Endpoints", () => {

  beforeAll(async function () {
    app = await server.getServer().launch();
  });
  afterAll(async function () {
    await server.killElectrum()
    app.close();
  });

  it("Should convert an amount from usd to bch", async () => {
    setupFetchMock("https://markets.api.bitcoin.com/live/bitcoin", { data: { BCH: 1337.42 } });

    const rate = await mainnet.Mainnet.getUsdRate();
    const convertResp = await request(app).post("/util/convert").send({
      value: 1,
      from: "bch",
      to: "usd",
    });
    checkResponse(convertResp);
    expect(convertResp.body.value).toEqual(rate);
  });

  it("Should get an exchange rate", async () => {
    setupFetchMock("https://markets.api.bitcoin.com/live/bitcoin", { data: { BCH: 1337.42 } });

    const rate = await mainnet.Mainnet.getUsdRate();
    const exchangeRateResp = await request(app).post("/util/exchange_rate").send({
      symbol: "usd"
    });
    checkResponse(exchangeRateResp);
    expect(exchangeRateResp.body.value).toEqual(rate);

    const failedResp = await request(app).post("/util/exchange_rate").send({
      symbol: "nonexistentcurrency"
    });

    expect(failedResp.status).toBe(500);
  });

  it("Should return xpubkey info", async () => {
    
    const resp = await request(app).post("/util/get_addrs_by_xpubKey").send({
      xpubkey: "xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj",
      path: "0/0",
      count: 3
      });
    checkResponse(resp);
    expect(resp.body).toStrictEqual([
      "bitcoincash:qrvcdmgpk73zyfd8pmdl9wnuld36zh9n4gms8s0u59",
      "bitcoincash:qp4wzvqu73x22ft4r5tk8tz0aufdz9fescwtpcmhc7",
      "bitcoincash:qr0kwqzf2h3wvjjhn4pg895lrxwp96wqgyhkksq2nh"               
  ]);
  });


  it("Should return cashaddrs from xpub", async () => {
    
    const resp = await request(app).post("/util/get_xpubkey_info").send({
        xpubkey: "xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj"
      });
    checkResponse(resp);
    expect(resp.body).toStrictEqual({
      "chain": "3da4bc190a2680111d31fadfdc905f2a7f6ce77c6f109919116f253d43445219",
      "childNumber": 2147483648,
      "data": "03774c910fcf07fa96886ea794f0d5caed9afe30b44b83f7e213bb92930e7df4bd",
      "depth": 3,
      "fingerprint": "6cc9f252",
      "parentFingerprint": "155bca59",
      "version": "mainnet",
     });
  });
});
