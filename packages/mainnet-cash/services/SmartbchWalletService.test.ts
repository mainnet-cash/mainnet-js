var server = require("../")
var request = require("supertest");

var app;

function checkStatus(resp) {;
  if (resp.statusCode !== 200) {
    throw resp.body;
  }
}

describe("Test Wallet Endpoints", () => {
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
  it("Should return the balance from a regtest wallet", async () => {
    const resp = await request(app)
      .post("/smartbch/wallet/balance")
      .send({
        walletId: `${process.env.SBCH_ALICE_ID}`,
      });
    checkStatus(resp);
    expect(resp.body.sat).toBeGreaterThan(100);
    expect(resp.body.bch).toBeGreaterThanOrEqual(1);
  });

  /**
   * watch balance
   */
  it("Should return the balance from a watch only regtest wallet", async () => {
    const resp = await request(app)
      .post("/smartbch/wallet/balance")
      .send({
        walletId: `watch:regtest:${process.env.SBCH_ALICE_ADDRESS}`,
      });
    checkStatus(resp);
    expect(resp.body.sat).toBeGreaterThan(100);
    expect(resp.body.bch).toBeGreaterThanOrEqual(1);
  });

  /**
   * balance in satoshi
   */
  it("Should return the balance from a regtest wallet in satoshi", async () => {
    const resp = await request(app)
      .post("/smartbch/wallet/balance")
      .send({
        walletId: `${process.env.SBCH_ALICE_ID}`,
        unit: "sat",
      });
    checkStatus(resp);
    expect(parseInt(resp.text)).toBeGreaterThanOrEqual(
      5000
    );
  });

  /**
   * createWallet
   */
  it("Should create a Regtest wallet form the API", async () => {
    let req = {
      name:"sbch A simple Testnet Wallet",
      type : "privkey",
      network: "regtest"
    }
    let resp = await request(app).post("/smartbch/wallet/create").send(req);
    const body = resp.body;
    checkStatus(resp);
    expect(body!.name).toBe(req.name);
    expect(body!.network).toBe(req.network);
    expect(body!.address!.startsWith("0x")).toBeTruthy();
    expect(body!.walletId).toBe("named:regtest:sbch A simple Testnet Wallet");
  });

  /**
   * depositAddress
   */

  it("Should return the deposit address from a regtest wallet", async () => {
    let resp = await request(app).post("/smartbch/wallet/deposit_address").send({
      walletId: `${process.env.SBCH_ALICE_ID}`,
    });
    checkStatus(resp);
    expect(resp.body.address).toBe(
      process.env.SBCH_ALICE_ADDRESS
    );
  });

  /**
   * depositQr
   */
  it("Should get the deposit qr from a regtest wallet", async () => {
    let resp = await request(app).post("/smartbch/wallet/deposit_qr").send({
      walletId: `${process.env.SBCH_ALICE_ID}`,
    });
    const body = resp.body;

    checkStatus(resp);
    expect(
      body!.src!.slice(0,36)
    ).toBe("data:image/svg+xml;base64,PD94bWwgdm");
  });

  /**
   * maxAmountToSend
   */
  it("Should accept a max amount to send request for a regtest wallet", async () => {
    const bobsWalletResp = await request(app).post("/smartbch/wallet/create").send({
      name: "sbch bobs wallet",
      network: "regtest",
    });

    expect(bobsWalletResp.body.walletId).toBe("named:regtest:sbch bobs wallet");
    const bobsAddress = bobsWalletResp.body.address;

    await request(app)
      .post("/smartbch/wallet/send")
      .send({
        walletId: `${process.env.SBCH_ALICE_ID}`,
        to: [
          {
            address: bobsAddress,
            unit: 'satoshis',
            value: 2000,
          },
        ],
        overrides: { gasPrice: 10 ** 10 }
      });

    let resp = await request(app).post("/smartbch/wallet/max_amount_to_send").send({
      walletId: bobsWalletResp.body.walletId,
    });
    const body = resp.body;
    checkStatus(resp);
    expect(body!.sat).toBeGreaterThan(1000);
  });

  /**
   * send
   */

  test("Should send from a Regtest wallet with the API", async () => {
    const bobsWalletResp = await request(app).post("/smartbch/wallet/create").send({
      type: "privkey",
      network: "regtest",
    });
    const bobsAddress = bobsWalletResp.body.address;

    const sendResp = await request(app)
      .post("/smartbch/wallet/send")
      .send({
        walletId: `${process.env.SBCH_ALICE_ID}`,
        to: {
          address: bobsAddress,
          unit: 'sat',
          value: 3000
        },
        overrides: { gasPrice: 10 ** 10 }
      });
    checkStatus(sendResp);

    const resp = await request(app).post("/smartbch/wallet/balance").send({
      walletId: bobsWalletResp.body.walletId,
    });

    const body = resp.body;
    checkStatus(resp);

    expect(bobsWalletResp.statusCode).toBe(200);
    expect(sendResp.statusCode).toBe(200);
    expect((sendResp.body[0].txId as string).length).toBe(66);
    expect(body.sat as number).toBe(3000);
  });

  /**
   * sendMax
   */

  it("Should send all available funds", async () => {
    let bobWalletReq = {
      name:"sbch Bob's Regtest Wallet",
      type:"seed",
      network:"regtest"
    };

    const bobsWalletResp = await request(app)
      .post("/smartbch/wallet/create")
      .send(bobWalletReq);
    checkStatus(bobsWalletResp);
    const bobsWallet = bobsWalletResp.body;
    expect(bobsWallet.address).toMatch(/0x/)

    let initialResp = await request(app).post("/smartbch/wallet/send").send({
      walletId: `${process.env.SBCH_ALICE_ID}`,
      to: [
        [bobsWallet.address, 1, 'bch']
      ],
      overrides: { gasPrice: 10 ** 10 }
    });
    checkStatus(initialResp);
    let resp = await request(app)
      .post("/smartbch/wallet/send_max")
      .send({
        walletId: bobsWallet.walletId,
        address: process.env.SBCH_ALICE_ADDRESS as string,
        overrides: { gasPrice: 10 ** 10 }
      });
    const body = resp.body;
    checkStatus(resp);
    expect((body.txId as string).length).toBe(66);
    expect(body.balance!.sat as number).toBeLessThan(50000);
  });

 /**
   * sign message
   */
 it("Should return a signed message", async () => {
  const resp = await request(app)
    .post("/smartbch/wallet/signed/sign")
    .send({
      walletId: `${process.env.SBCH_ALICE_ID}`,
      message: "test"
    });
  checkStatus(resp);
  expect(resp.body!.signature).toBe("0xa54773207fb97438aea33e024c376b05dc714d7fb4192ed1f8c7fc72a8c12d527223f871f20d117e6706c55d953c2c960472d23dd2856d6c000c6f96ee8332ee1b");
});

/**
   * verify signed message
   */
 it("Should verify a signed message", async () => {
  const resp = await request(app)
    .post("/smartbch/wallet/signed/verify")
    .send({
      walletId: `watch:regtest:${process.env.SBCH_ALICE_ADDRESS}`,
      message: "test",
      signature: "0xa54773207fb97438aea33e024c376b05dc714d7fb4192ed1f8c7fc72a8c12d527223f871f20d117e6706c55d953c2c960472d23dd2856d6c000c6f96ee8332ee1b"
    });
  checkStatus(resp);
  expect(resp.body!.valid).toBe(true);
  });
});
