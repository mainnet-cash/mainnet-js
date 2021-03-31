
var mainnet = require("mainnet-js");
var server = require("../")
var request = require("supertest");
var app;

describe("Test Wallet Slp Endpoints", () => {
  beforeAll(async function () {
    app = await server.getServer().launch();
  });
  afterAll(async function () {
    await server.killElectrum()
    app.close();
  });

  let ticker: string = Math.random().toString(36).substring(8).toUpperCase();
  let tokenId: string;

  /**
   * genesis
   */
  it("Should create a new token (genesis)", async () => {
    const resp = await request(app)
      .post("/wallet/slp/genesis")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        name: "Mainnet coin",
        ticker: ticker,
        initialAmount: "10000",
        decimals: 2,
        documentUrl: "https://mainnet.cash",
        documentHash: "db4451f11eda33950670aaf59e704da90117ff7057283b032cfaec7779313916",
        endBaton: false
      });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.tokenId.length).toBe(64);
    expect(Number(resp.body.balance.value)).toBe(10000);
    tokenId = resp.body.tokenId;
  });

  /**
   * NFT genesis
   */
  it("Should create a new NFT Parent and Child tokens (genesis)", async () => {
    const options = {
      walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      name: "Mainnet coin NFT Parent",
      ticker: ticker,
      initialAmount: "10000",
      decimals: 2,
      documentUrl: "https://mainnet.cash",
      documentHash: "db4451f11eda33950670aaf59e704da90117ff7057283b032cfaec7779313916",
      endBaton: false,
      parentTokenId: undefined
    };

    let resp = await request(app)
      .post("/wallet/slp/nft_parent_genesis")
      .send({...options});

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.tokenId.length).toBe(64);
    expect(Number(resp.body.balance.value)).toBe(10000);

    const nftParentId = resp.body.tokenId;

    resp = await request(app)
      .post("/wallet/slp/token_info")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        tokenId: nftParentId,
      });

    let body = resp.body;

    expect(resp.statusCode).toBe(200);
    expect(body).toBeDefined();
    expect(body.tokenId).toBe(nftParentId);
    expect(body.type).toBe(0x81);

    options.name = "Mainnet coin NFT Child";
    options.parentTokenId = nftParentId;

    resp = await request(app)
      .post("/wallet/slp/nft_child_genesis")
      .send({...options});

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.tokenId.length).toBe(64);
    expect(Number(resp.body.balance.value)).toBe(1);

    const nftChildId = resp.body.tokenId;

    resp = await request(app)
      .post("/wallet/slp/token_info")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        tokenId: nftChildId,
      });

    body = resp.body;

    expect(resp.statusCode).toBe(200);
    expect(body).toBeDefined();
    expect(body.tokenId).toBe(nftChildId);
    expect(body.type).toBe(0x41);
  });

  it("Should get token infos", async () => {
    let resp = await request(app)
      .post("/wallet/slp/token_info")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        tokenId: tokenId,
      });

    let body = resp.body;

    expect(resp.statusCode).toBe(200);
    expect(body).toBeDefined();
    expect(body.tokenId).toBe(tokenId);
  });

  it("Should mint new tokens", async () => {
    const resp = await request(app)
      .post("/wallet/slp/mint")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        value: "10000",
        tokenId: tokenId,
        endBaton: false
      });
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.txId.length).toBe(64);
    expect(Number(resp.body.balance.value)).toBe(20000);
  });

  /**
   * balance
   */
  it("Should return the slp balance from a regtest wallet", async () => {
    const resp = await request(app)
      .post("/wallet/slp/balance")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        tokenId: tokenId
      });
    expect(resp.statusCode).toEqual(200);
    expect(Number(resp.body.value)).toBe(20000);
  });

  /**
   * all balances
   */
  it("Should return alp slp balances from a regtest wallet", async () => {
    const resp = await request(app)
      .post("/wallet/slp/all_balances")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      });
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.length).toBeGreaterThanOrEqual(1);
    expect(resp.body.map(val => Number(val.value))).toContain(20000);
  });

  /**
   * depositAddress
   */
  it("Should return the deposit address from a regtest wallet", async () => {
    let resp = await request(app).post("/wallet/slp/deposit_address").send({
      walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
    });
    expect(resp.statusCode).toBe(200);
    expect(resp.body.slpaddr).toBe(mainnet.toSlpAddress(process.env.ADDRESS!));
  });

  /**
   * depositQr
   */
  it("Should get the deposit qr from a regtest wallet", async () => {
    let resp = await request(app).post("/wallet/slp/deposit_qr").send({
      walletId:
        `wif:regtest:${process.env.PRIVATE_WIF}`,
    });
    const body = resp.body;

    expect(resp.statusCode).toBe(200);
    expect(
      body!.src!.slice(0,36)
    ).toBe("data:image/svg+xml;base64,PD94bWwgdm");
  });

  /**
   * send
   */
  test("Should send slp from a Regtest wallet with the API", async () => {
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      const bobsWalletResp = await request(app).post("/wallet/create").send({
        type: "wif",
        network: "regtest",
      });
      const bobsCashaddr = bobsWalletResp.body.cashaddr;

      const sendResp = await request(app)
        .post("/wallet/slp/send")
        .send({
          walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
          to: [{
            slpaddr: bobsCashaddr,
            tokenId: tokenId,
            value: 10
          }]
        });

      const resp = await request(app).post("/wallet/slp/balance").send({
        walletId: bobsWalletResp.body.walletId,
        tokenId: tokenId
      });

      const body = resp.body;

      expect(bobsWalletResp.statusCode).toBe(200);
      expect(sendResp.statusCode).toBe(200);
      expect((sendResp.body.txId as string).length).toBe(64);
      expect(resp.statusCode).toBe(200);
      expect(Number(body.value)).toBe(10);
    }
  });

  /**
   * sendMax
   */

  it("Should send all available slp funds", async () => {
    let bobWalletReq = {
      name:"Bob's Regtest Wallet",
      type:"seed",
      network:"regtest"
    };

    const bobsWalletResp = await request(app)
      .post("/wallet/create")
      .send(bobWalletReq);
    const bobsWallet = bobsWalletResp.body;

    // give bob some bch gas
    let initialResp = await request(app).post("/wallet/send").send({
      walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      to: [{
        cashaddr: bobsWallet.cashaddr,
        unit: 'sat',
        value: 3000
      }]
    });
    if (initialResp.statusCode !== 200) {
      console.log(initialResp.error.text);
    }

    let initialSlpResp = await request(app).post("/wallet/slp/send").send({
      walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      to: [{
        slpaddr: bobsWallet.cashaddr,
        tokenId: tokenId,
        value: 10
      }]
    });
    if (initialSlpResp.statusCode !== 200) {
      console.log(initialSlpResp.error.text);
    }

    let slpResp = await request(app)
      .post("/wallet/slp/send_max")
      .send({
        walletId: bobsWallet.walletId,
        slpaddr: process.env.ADDRESS,
        tokenId: tokenId
      });
    const slpBody = slpResp.body;
    if (slpResp.statusCode !== 200) {
      console.log(slpResp.error.text);
    }

    expect(slpResp.statusCode).toBe(200);
    expect((slpBody.txId as string).length).toBe(64);
    expect(Number(slpBody.balance.value)).toBe(0);

    let resp = await request(app)
      .post("/wallet/send_max")
      .send({
        walletId: bobsWallet.walletId,
        cashaddr: process.env.ADDRESS,
      });
    const body = resp.body;
    if (resp.statusCode !== 200) {
      console.log(resp.error.text);
    }
    expect(resp.statusCode).toBe(200);
    expect((body.txId as string).length).toBe(64);
    expect(body.balance!.bch as number).toBe(0);
    expect(body.balance!.sat as number).toBe(0);
  });
  /**
   * utxos
   */
  it("Should return the unspent slp transaction outputs for a regtest wallet", async () => {
    const resp = await request(app)
      .post("/wallet/slp/utxo")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      });

    const body = resp.body;
    expect(resp.statusCode).toBe(200);
    expect(body.utxos.length).toBeGreaterThan(0);
  });

  /**
   * outpoints
   */
   it("Should return the unspent slp transaction outpoints for a regtest wallet", async () => {
    const resp = await request(app)
      .post("/wallet/slp/outpoints")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      });

    const body = resp.body;
    expect(resp.statusCode).toBe(200);
    expect(body.outpoints.length).toBeGreaterThan(0);
    const outpoint = body.outpoints[0].split(':');
    expect(outpoint[0].length).toBe(64);
    expect(parseInt(outpoint[1])).toBeGreaterThanOrEqual(0);
  });
});
