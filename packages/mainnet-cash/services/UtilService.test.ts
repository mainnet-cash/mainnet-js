import * as mainnet from "mainnet-js";
import server from "../";
import request from "supertest";
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

  it("Should return xpubkey info", async () => {
    
    const resp = await request(app).post("/util/get_addrs_by_xpubKey").send({
      xpubkey: "xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj",
      path: "0/0",
      count: 3
      });
    expect(resp.statusCode).toEqual(200);
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
    expect(resp.statusCode).toEqual(200);
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
