import { binToBase64, binToHex, hexToBin, utf8ToBin } from "@bitauth/libauth";


import server from "../index.js";
import request from "supertest";
import * as mainnet from "mainnet-js";

var app;

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
      .post("/wallet/balance")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      });
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.sat).toBeGreaterThan(100);
    expect(resp.body.bch).toBeGreaterThanOrEqual(5000);
  });

  /**
   * watch balance
   */
  it("Should return the balance from a watch only regtest wallet", async () => {
    const resp = await request(app)
      .post("/wallet/balance")
      .send({
        walletId: `watch:regtest:bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0`,
      });
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.sat).toBeGreaterThan(100);
    expect(resp.body.bch).toBeGreaterThanOrEqual(5000);
  });

  /**
   * balance in satoshi
   */
  it("Should return the balance from a regtest wallet in satoshi", async () => {
    const resp = await request(app)
      .post("/wallet/balance")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        unit: "sat",
      });
    expect(resp.statusCode).toEqual(200);
    expect(parseInt(resp.text)).toBeGreaterThanOrEqual(
      5000 * 100000000
    );
  });

  /**
   * createWallet
   */
  it("Should create a Regtest wallet form the API", async () => {
    let req = {
      name:"A simple Testnet Wallet",
    type : "wif",
    network:"regtest"
  }
    let resp = await request(app).post("/wallet/create").send(req);
    const body = resp.body;
    expect(resp.statusCode).toBe(200);
    expect(body!.name).toBe(req.name);
    expect(body!.network).toBe(req.network);
    expect(body!.cashaddr!.startsWith("bchreg:")).toBeTruthy();
    expect(body!.walletId).toBe("named:regtest:A simple Testnet Wallet");
  });


  it("Should create a Testnet wallet with the API", async () => {
    let req = {
      name:"A simple Testnet Wallet",
    type : "wif",
    network:"testnet"
  }

    let resp = await request(app).post("/wallet/create").send(req);
    const body = resp.body;
    expect(resp.statusCode).toBe(200);
    expect(body!.name).toBe(req.name);
    expect(body!.network).toBe(req.network);
    expect(body!.cashaddr!.startsWith("bchtest:")).toBeTruthy();
    expect(body!.walletId).toBe("named:testnet:A simple Testnet Wallet");
  });

  it("Should error saving a named Mainnet wallet with the API", async () => {
    process.env.ALLOW_MAINNET_USER_WALLETS = "false"
    let req = {
      name:"A simple Mainnet Wallet",
    type : "wif",
    network:"mainnet"
  }

    let resp = await request(app).post("/wallet/create").send(req);
    expect(resp.statusCode).toBe(500);
    expect(resp.body.message).toBe("Refusing to save wallet in an open public database, remove ALLOW_MAINNET_USER_WALLETS=\"false\", if this service is secure and private");
  });

  it("Should create an unnamed Mainnet wallet with the API", async () => {
    
    let req = {
    type : "seed",
    network:"mainnet"
  }

    
    let resp = await request(app).post("/wallet/create").send(req);
    const body = resp.body;
    expect(resp.statusCode).toBe(200);
    expect(body!.network).toBe(req.network);
    expect(body!.cashaddr!.startsWith("bitcoincash:")).toBeTruthy();
    expect(body!.walletId!.startsWith("seed:mainnet:")).toBeTruthy();
  });

  it("Should create a mainnet wallet on empty request", async () => {
    let resp = await request(app).post("/wallet/create").send({});
    const body = resp.body;

    expect(resp.statusCode).toBe(200);
    expect(body!.name).toBe("");
    expect(body!.network).toBe("mainnet");
    expect(body!.cashaddr!.startsWith("bitcoincash:")).toBeTruthy();
    expect(body!.seed!).toMatch(/(\w+\s){11}\w+/);
    expect(body!.derivationPath!).toBe("m/44'/0'/0'/0/0");
    expect(body!.walletId!.startsWith("seed:mainnet:")).toBeTruthy();
  });

  /**
   * depositAddress
   */

  it("Should return the deposit address from a regtest wallet", async () => {
    let resp = await request(app).post("/wallet/deposit_address").send({
      walletId:
        "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    });
    expect(resp.statusCode).toBe(200);
    expect(resp.body.cashaddr).toBe(
      "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0"
    );
  });

  /**
   * depositQr
   */
  it("Should get the deposit qr from a regtest wallet", async () => {
    let resp = await request(app).post("/wallet/deposit_qr").send({
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
   * getHistory
   */
   it("Should return a wallet history", async () => {
    const bobsWalletResp = await request(app).post("/wallet/create").send({
      name: "bobs wallet",
      network: "regtest",
    });

    const bobsCashaddr = bobsWalletResp.body.cashaddr;

    await request(app)
      .post("/wallet/send")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        to: [
          {
            cashaddr: bobsCashaddr,
            unit: 'satoshis',
            value: 6000,
          },
          {
            cashaddr: bobsCashaddr,
            unit: 'satoshis',
            value: 6000,
          },
          {
            cashaddr: bobsCashaddr,
            unit: 'satoshis',
            value: 6000,
          },
          {
            cashaddr: bobsCashaddr,
            unit: 'satoshis',
            value: 6000,
          },
          {
            cashaddr: bobsCashaddr,
            unit: 'satoshis',
            value: 6000,
          },
          {
            cashaddr: bobsCashaddr,
            unit: 'satoshis',
            value: 6000,
          },
        ],
      });


    let resp = await request(app).post("/wallet/get_history").send({
      walletId: bobsWalletResp.body.walletId,
    });
    const body = resp.body;
    expect(resp.statusCode).toBe(200);
    expect(
      body!.transactions!.length
    ).toBeGreaterThan(5);
  });

  /**
   * maxAmountToSend
   */
  it("Should accept a max amount to send request for a regtest wallet", async () => {
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      const bobsWalletResp = await request(app).post("/wallet/create").send({
        name: "bobs wallet",
        network: "regtest",
      });

      expect(bobsWalletResp.body.walletId).toBe("named:regtest:bobs wallet");
      const bobsCashaddr = bobsWalletResp.body.cashaddr;

      await request(app)
        .post("/wallet/send")
        .send({
          walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
          to: [
            {
              cashaddr: bobsCashaddr,
              unit: 'satoshis',
              value: 2000,
            },
          ],
        });

      let resp = await request(app).post("/wallet/max_amount_to_send").send({
        walletId: bobsWalletResp.body.walletId,
      });
      const body = resp.body;
      expect(resp.statusCode).toBe(200);
      expect(body!.sat).toBeGreaterThan(1000);
    }
  });

  /**
   * send
   */

  test("Should send from a Regtest wallet with the API", async () => {
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      const bobsWalletResp = await request(app).post("/wallet/create").send({
        type: "wif",
        network: "regtest",
      });
      const bobsCashaddr = bobsWalletResp.body.cashaddr;

      const sendResp = await request(app)
        .post("/wallet/send")
        .send({
          walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
          to: [{
            cashaddr: bobsCashaddr,
            unit: 'sat',
            value: 3000
          }]
        });

      const resp = await request(app).post("/wallet/balance").send({
        walletId: bobsWalletResp.body.walletId,
      });

      const body = resp.body;

      expect(bobsWalletResp.statusCode).toBe(200);
      expect(sendResp.statusCode).toBe(200);
      expect((sendResp.body.txId as string).length).toBe(64);
      expect(resp.statusCode).toBe(200);
      expect(body.sat as number).toBe(3000);
    }
  });

  test("Should send from a Regtest wallet with the API", async () => {
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      const aliceWalletResp = await request(app).post("/wallet/create").send({
        type: "wif",
        network: "regtest",
      });
      const bobsWalletResp = await request(app).post("/wallet/create").send({
        type: "wif",
        network: "regtest",
      });
      const bobsCashaddr = bobsWalletResp.body.cashaddr;
      const charlieWalletResp = await request(app).post("/wallet/create").send({
        type: "wif",
        network: "regtest",
      });

      const aliceSendResp = await request(app)
      .post("/wallet/send")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        to: [{
          cashaddr: aliceWalletResp.body.cashaddr,
          unit: 'sat',
          value: 5000
        }]
      });
      const sendResp = await request(app)
        .post("/wallet/send")
        .send({
          walletId: aliceWalletResp.body.walletId,
          to: [{
            cashaddr: bobsCashaddr,
            unit: 'sat',
            value: 3000
          }],
          options:{
            changeAddress: charlieWalletResp.body.cashaddr!
          }
        });

      const bobBalanceResp = await request(app).post("/wallet/balance").send({
        walletId: bobsWalletResp.body.walletId,
      });
      const charlieBalanceResp = await request(app).post("/wallet/balance").send({
        walletId: charlieWalletResp.body.walletId,
      });


      expect(sendResp.statusCode).toBe(200);
      expect((sendResp.body.txId as string).length).toBe(64);
      expect(bobBalanceResp.statusCode).toBe(200);
      expect(bobBalanceResp.body.sat as number).toBe(3000);

      expect(charlieBalanceResp.statusCode).toBe(200);
      expect(charlieBalanceResp.body.sat as number).toBe(1780);
    }
  });

  // This is an integration test of send w/utxoIds
  test("Should send from specific utxos", async () => {
   
    // make a random wallet for bob
      const bobsWalletResp = await request(app).post("/wallet/create").send({
        type: "wif",
        network: "regtest",
      });
      expect(bobsWalletResp.statusCode).toBe(200);
      const bobsCashaddr = bobsWalletResp.body.cashaddr;

      // send bob utxos worth 1001, 1000 & 1001
      const sendResp = await request(app)
        .post("/wallet/send")
        .send({
          walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
          to: [
            {
              cashaddr: bobsCashaddr!,
              value: 1001,
              unit: "satoshis",
            },
            {
              cashaddr: bobsCashaddr!,
              value: 1000,
              unit: "satoshis",
            },
            {
              cashaddr: bobsCashaddr!,
              value: 1001,
              unit: "satoshis",
            },
          ]
        });
        expect(sendResp.statusCode).toBe(200);


        // Check bob's balance
      const bobBalanceResp = await request(app).post("/wallet/balance").send({
        walletId: bobsWalletResp.body.walletId,
      });
      expect(bobBalanceResp.statusCode).toBe(200);
      expect(bobBalanceResp.body.sat as number).toBe(3002);

      // Get the utxoIds of bob's wallet
      const utxoResp = await request(app)
      .post("/wallet/utxo")
      .send({
        walletId: bobsWalletResp.body.walletId,
      });
      expect(utxoResp.statusCode).toBe(200);

      // Filter utxoIds to a list of odd valued ones
      let utxoIds = utxoResp.body.utxos!.filter((utxo) => utxo.value % 2 == 1)
      .map((utxo) => {
        return utxo.utxoId;
      });

      // create a random new wallet
      const charliesWalletResp = await request(app).post("/wallet/create").send({
        type: "wif",
        network: "regtest",
      });
      expect(charliesWalletResp.statusCode).toBe(200);

      // Send to charlie using odd valued utxoIds from bob
      const finalSendResp = await request(app)
        .post("/wallet/send")
        .send({
          walletId: bobsWalletResp.body.walletId,
          to: [
            {
              cashaddr: charliesWalletResp.body.cashaddr!,
              value: 1600,
              unit: "satoshis",
            },
          ],
          options:{"utxoIds":utxoIds}
        });
        expect(finalSendResp.statusCode).toBe(200);
        
        // Assure that bob now has 1 utxo
      const utxoResp2 = await request(app)
      .post("/wallet/utxo")
      .send({
        walletId: bobsWalletResp.body.walletId,
      });
      expect(utxoResp2.body.utxos!.length).toBe(1);

      // Assure that bob still has 1000 sat
      let bobBalanceResp2 = await request(app).post("/wallet/balance").send({
        walletId: bobsWalletResp.body.walletId,
      });
      expect(bobBalanceResp2.body.sat).toBe(1000)

      // Assure that charlie has the amount sent
      let charlieBalanceResp = await request(app).post("/wallet/balance").send({
        walletId: charliesWalletResp.body.walletId,
      });
      expect(charlieBalanceResp.body.sat).toBe(1600)
  });

  /**
   * send w/feePaidBy
   */

   test("Should send with feePaidBy strategy", async () => {
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      const aliceResp = await request(app).post("/wallet/create").send({
        type: "wif",
        network: "regtest",
      });
      const bobResp = await request(app).post("/wallet/create").send({
        type: "wif",
        network: "regtest",
      });
      const charlieResp = await request(app).post("/wallet/create").send({
        type: "wif",
        network: "regtest",
      });
      const daveResp = await request(app).post("/wallet/create").send({
        type: "wif",
        network: "regtest",
      });
      const edwardResp = await request(app).post("/wallet/create").send({
        type: "wif",
        network: "regtest",
      });
      const fundingResp = await request(app)
      .post("/wallet/send")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        to: [{
          cashaddr: aliceResp.body.cashaddr,
          unit: 'sat',
          value: 4500
        }]
      });
      const sendResp = await request(app)
        .post("/wallet/send")
        .send({
          walletId: aliceResp.body.walletId,
          to: [{
            cashaddr: bobResp.body.cashaddr,
            unit: 'sat',
            value: 549
          },
          {
            cashaddr: charlieResp.body.cashaddr,
            unit: 'sat',
            value: 550
          },
          {
            cashaddr: daveResp.body.cashaddr,
            unit: 'sat',
            value: 551
          },
          {
            cashaddr: edwardResp.body.cashaddr,
            unit: 'sat',
            value: 2552
          }],
          options:{feePaidBy:'changeThenAny'}
        });

      const aliceBalanceResp = await request(app).post("/wallet/balance").send({
        walletId: aliceResp.body.walletId,
      });
      const bobBalanceResp = await request(app).post("/wallet/balance").send({
        walletId: bobResp.body.walletId,
      });
      const charlieBalanceResp = await request(app).post("/wallet/balance").send({
        walletId: charlieResp.body.walletId,
      });
      const daveBalanceResp = await request(app).post("/wallet/balance").send({
        walletId: daveResp.body.walletId,
      });
      const edwardBalanceResp = await request(app).post("/wallet/balance").send({
        walletId: edwardResp.body.walletId,
      });

      const alice = aliceBalanceResp.body.sat as number;
      const bob = bobBalanceResp.body.sat as number;
      const charlie = charlieBalanceResp.body.sat as number;
      const dave = daveBalanceResp.body.sat as number;
      const edward = edwardBalanceResp.body.sat as number;

      expect(sendResp.statusCode).toBe(200);
      expect(aliceBalanceResp.statusCode).toBe(200);
      expect(bobBalanceResp.statusCode).toBe(200);
      expect(charlieBalanceResp.statusCode).toBe(200);
      expect(daveBalanceResp.statusCode).toBe(200);
      expect(edwardBalanceResp.statusCode).toBe(200);
      expect((sendResp.body.txId as string).length).toBe(64);
      expect(alice).toBe(0);
      expect(bob).toBe(0);
      expect(charlie).toBe(550);
      expect(dave).toBe(551);
      expect(edward).toBe(2552);
    }
  });

  /**
   * sendMax
   */

  it("Should send all available funds", async () => {
    let bobWalletReq = {
      name:"Bob's Regtest Wallet",
      type:"seed", 
      network:"regtest"
    };

    const bobsWalletResp = await request(app)
      .post("/wallet/create")
      .send(bobWalletReq);
    const bobsWallet = bobsWalletResp.body;
    expect(bobsWallet.cashaddr).toMatch(/bchreg:[q|p]\w{41}/)

    let initialResp = await request(app).post("/wallet/send").send({
      walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      to: [{
        cashaddr: bobsWallet.cashaddr,
        unit: 'bch',
        value: 1
      }]
    });
    if (initialResp.error) {
      console.log(initialResp.error.text);
    }
    let resp = await request(app)
      .post("/wallet/send_max")
      .send({
        walletId: bobsWallet.walletId,
        cashaddr: process.env.ADDRESS as string,
      });
    const body = resp.body;
    if (resp.error) {
      console.log(resp.error.text);
    }
    expect(resp.statusCode).toBe(200);
    expect((body.txId as string).length).toBe(64);
    expect(body.balance!.bch as number).toBe(0);
    expect(body.balance!.sat as number).toBe(0);
  });

  // This is an integration test of sendMax w/utxoIds
  test("Should send from specific utxos", async () => {
   
    // Create a random wallet to send utxos from
    const bobsWalletResp = await request(app).post("/wallet/create").send({
      type: "wif",
      network: "regtest",
    });
    expect(bobsWalletResp.statusCode).toBe(200);
    const bobsCashaddr = bobsWalletResp.body.cashaddr;

    // send bob 1001,1000 & 1001 utxos
    const sendResp = await request(app)
      .post("/wallet/send")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        to: [
          {
            cashaddr: bobsCashaddr!,
            value: 1001,
            unit: "satoshis",
          },
          {
            cashaddr: bobsCashaddr!,
            value: 1000,
            unit: "satoshis",
          },
          {
            cashaddr: bobsCashaddr!,
            value: 1001,
            unit: "satoshis",
          },
        ]
      });
      expect(sendResp.statusCode).toBe(200);
      expect((sendResp.body.txId as string).length).toBe(64);

      // request bob's balance 
    const bobBalanceResp = await request(app).post("/wallet/balance").send({
      walletId: bobsWalletResp.body.walletId,
    });

    // expect bob's balance is correct
    expect(bobBalanceResp.statusCode).toBe(200);
    expect(bobBalanceResp.body.sat as number).toBe(3002);

    // get bob's utxos
    const utxoResp = await request(app)
    .post("/wallet/utxo")
    .send({
      walletId: bobsWalletResp.body.walletId,
    });
    expect(utxoResp.statusCode).toBe(200);
    expect(utxoResp.body.utxos!.length).toBe(3);

    // filter to just even odd valued utxos
    let utxoIds = utxoResp.body.utxos!.filter((utxo) => utxo.value % 2 == 1)
    .map((utxo) => {
      return utxo.utxoId;
    });
    expect(utxoIds!.length).toBe(2);
    
    // create a random charlie wallet
    const charliesWalletResp = await request(app).post("/wallet/create").send({
      type: "wif",
      network: "regtest",
    });
    expect(charliesWalletResp.statusCode).toBe(200);

    // Send money from bob to charlie using only the odd utxos
    const finalSendResp = await request(app)
      .post("/wallet/send_max")
      .send({
        walletId: bobsWalletResp.body.walletId,
        cashaddr: charliesWalletResp.body.cashaddr!,
        options:{"utxoIds":utxoIds}
      });
      expect(finalSendResp.statusCode).toBe(200);

      // Request bob's final balance
    let bobBalanceResp2 = await request(app).post("/wallet/balance").send({
      walletId: bobsWalletResp.body.walletId,
    });

    const utxoResp2 = await request(app)
    .post("/wallet/utxo")
    .send({
      walletId: bobsWalletResp.body.walletId,
    });

    // Should only include the one even utxo
    expect(utxoResp2.body.utxos!.length).toBe(1);
    expect(utxoResp2.body.utxos[0].value).toBe(1000)


    // Should have the balance sent 
    let charlieBalanceResp = await request(app).post("/wallet/balance").send({
      walletId: charliesWalletResp.body.walletId,
    });
    expect(charlieBalanceResp.body.sat).toBeGreaterThan(1600)
});

  /**
   * utxos
   */
  it("Should return the unspent transaction outputs for a regtest wallet", async () => {
    const resp = await request(app)
      .post("/wallet/utxo")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      });

    const body = resp.body;
    if (body.utxos) {
      const valueArray = await Promise.all(
        body.utxos.map(async (b) => {
          return b!.value || 0;
        })
      );
      const value = valueArray.reduce((a:any, b:any) => a + b, 0);
      expect(resp.statusCode).toBe(200);
      expect(value).toBeGreaterThan(490 * 100000000);
      expect(body!.utxos!.length).toBeGreaterThan(100);
    } else {
      throw Error("no utxos returned");
    }
  });

  /**
   * info
   */
  it("Should return information about a wallet", async () => {
    const resp = await request(app)
      .post("/wallet/info")
      .send({
        walletId: `seed:regtest:circle absurd gown body core shine aisle valid aspect grit material muscle:m/44'/0'/0'/0/0`,
      });
      expect(resp.statusCode).toBe(200);
      let expectedResult = {
        "cashaddr":"bchreg:qzghep5tpvpsu35j4mdv8xpycr6fujlxmvhm50wzu2",
        "isTestnet":true,
        "name":"",
        "network":"regtest",
        "seed":"circle absurd gown body core shine aisle valid aspect grit material muscle",
        "derivationPath":"m/44'/0'/0'/0/0",
        "publicKey":"040eb64bec66609ffe66befa74ad1973b72c1d6d957c919c39a5caf5bfe7571b109e299534bb5fdf1499a73e22c0a82ee784da9e21571285facd2ad73a0fe747ed",
        "publicKeyHash":"917c868b0b030e4692aedac39824c0f49e4be6db",
        "privateKey":"3ddbfcdb089ad3a72299538d575bc22c3bd1d99a6a7b2ff04b6e02ad6beb38eb",
        "privateKeyWif":"cPewwd9EdxfFgLdNR2cx5asjywa5YYvGMWPZLenArEoP8U6XfC8a",
        "walletId":"seed:regtest:circle absurd gown body core shine aisle valid aspect grit material muscle:m/44'/0'/0'/0/0",
        "walletDbEntry":"seed:regtest:circle absurd gown body core shine aisle valid aspect grit material muscle:m/44'/0'/0'/0/0"}
      expect(resp.body).toMatchObject(expectedResult);
  });

  /**
   * info (Watch)
   */
  it("Should return information about a watch wallet", async () => {
    const resp = await request(app)
      .post("/wallet/info")
      .send({
        walletId: `watch:testnet:bchtest:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22`,
      });
      expect(resp.statusCode).toBe(200);
      let expectedResult = {
        "cashaddr": "bchtest:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22",
        "isTestnet": true,
        "name": "",
        "network": "testnet",
        "publicKeyHash": "4232dfceb98a117308072d75fe47fb10c97d038a",
        "walletDbEntry": "watch:testnet:bchtest:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22",
        "walletId": "watch:testnet:bchtest:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22",
     }
      expect(resp.body).toMatchObject(expectedResult);
  });

  /**
   * replaceNamed, namedExists
   */
   it("Should Store and replace a Regtest wallet, check wallet existence", async () => {
    const name = `storereplace ${Math.random()}`

    let resp;
    resp = await request(app)
      .post("/wallet/named_exists")
      .send({
        name: name,
        type : "seed",
        network: "regtest"
      });
    expect(resp.statusCode).toBe(200);
    expect(resp.body.result).toBe(false);

    const seedId = `seed:regtest:abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon:m/44'/0'/0'/0/0`;
    resp = await request(app)
      .post("/wallet/replace_named")
      .send({
        name: name,
        walletId: seedId,
        type : "seed",
        network: "regtest"
    });
    expect(resp.statusCode).toBe(200);
    expect(resp.body.result).toBe(true);

    resp = await request(app)
      .post("/wallet/named_exists")
      .send({
        name: name,
        type : "seed",
        network: "regtest"
      });
    expect(resp.statusCode).toBe(200);
    expect(resp.body.result).toBe(true);
  });

  /**
   * send, OP_RETURN
   */
   it("Should send funds and OP_RETURN data", async () => {
    const provider = mainnet.getNetworkProvider('regtest');
    let result, transaction;
    result = await request(app).post("/wallet/send").send({
      walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      to: [
        {
          dataString: "MEMO\x10LÖL😅"
        },
        {
          dataBuffer: binToBase64(utf8ToBin("MEMO\x10LÖL😅"))
        },
        {
          cashaddr: process.env.ADDRESS!,
          unit: 'sat',
          value: 546
        }
      ]
    });

    expect(result.statusCode).toBe(200);
    transaction = await provider.getRawTransactionObject(result.body.txId!);
    expect(transaction.vout[0].scriptPubKey.asm).toContain("OP_RETURN");
    expect(transaction.vout[0].scriptPubKey.hex.slice(6)).toBe(binToHex(utf8ToBin("MEMO\x10LÖL😅")));
    expect(transaction.vout[1].scriptPubKey.asm).toContain("OP_RETURN");
    expect(transaction.vout[1].scriptPubKey.hex.slice(6)).toBe(binToHex(utf8ToBin("MEMO\x10LÖL😅")));


    result = await request(app).post("/wallet/send").send({
      walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      to: [
        [process.env.ADDRESS!, 546, 'sats'],
        ['OP_RETURNB64', binToBase64(Uint8Array.from([0x00, 0x01, 0x02]))],
      ]
    });

    expect(result.statusCode).toBe(200);
    transaction = await provider.getRawTransactionObject(result.body.txId!);
    expect(transaction.vout[1].scriptPubKey.asm).toContain("OP_RETURN");
    expect([...hexToBin(transaction.vout[1].scriptPubKey.hex.slice(6))]).toStrictEqual([0x00, 0x01, 0x02]);


    result = await request(app).post("/wallet/send").send({
      walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
      to: [
        ['OP_RETURN', ''],
        ['OP_RETURNB64', binToBase64(Uint8Array.from([]))],
      ]
    });

    expect(result.statusCode).toBe(200);
    transaction = await provider.getRawTransactionObject(result.body.txId!);
    expect(transaction.vout[0].scriptPubKey.asm).toContain("OP_RETURN");
    expect([...hexToBin(transaction.vout[0].scriptPubKey.hex)]).toStrictEqual([0x6a, 0x4c, 0x00]);
    expect(transaction.vout[1].scriptPubKey.asm).toContain("OP_RETURN");
    expect([...hexToBin(transaction.vout[1].scriptPubKey.hex)]).toStrictEqual([0x6a, 0x4c, 0x00]);
  });

  /**
   * slpSemiAware integration test
   */
   it("Should return the balance from a watch only regtest wallet", async () => {
    const bobsWalletResp = await request(app).post("/wallet/create").send({
      network: "regtest",
    });
    const bobsCashaddr = bobsWalletResp.body.cashaddr;
    const bobsWalletId = bobsWalletResp.body.walletId;


    await request(app)
      .post("/wallet/send")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        to: [
          {
            cashaddr: bobsCashaddr,
            unit: 'satoshis',
            value: 546,
          },
          {
            cashaddr: bobsCashaddr,
            unit: 'satoshis',
            value: 1000,
          },
        ],
      });

      let result;
      result = await request(app)
        .post("/wallet/balance")
        .send({
          walletId: bobsWalletId
        });
      expect(result.body.sat).toBe(1546);

      // slpSemiAware
      result = await request(app)
        .post("/wallet/balance")
        .send({
          walletId: bobsWalletId,
          slpSemiAware: true
        });
      expect(result.body.sat).toBe(1000);

      result = await request(app)
        .post("/wallet/max_amount_to_send")
        .send({
          walletId: bobsWalletId,
          options: { slpSemiAware: true }
        });
      expect(result.body.sat).toBe(780);


      result = await request(app)
        .post("/wallet/send_max")
        .send({
          walletId: bobsWalletId,
          cashaddr: process.env.ADDRESS as string,
          options: { slpSemiAware: true }
        });

      result = await request(app)
        .post("/wallet/balance")
        .send({
          walletId: bobsWalletId,
          slpSemiAware: true
        });
      expect(result.body.sat).toBe(0);

      result = await request(app)
        .post("/wallet/balance")
        .send({
          walletId: bobsWalletId,
          slpSemiAware: false
        });
      expect(result.body.sat).toBe(546);
  });

  /**
   * xpubkeys should return valid xpubkeys
   */
   it("Should return xpubkeys if not provided a path", async () => {

    let resp;


    const seedId = `seed:regtest:abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon:m/44'/0'/0'/0/0`;
    resp = await request(app)
      .post("/wallet/xpubkeys")
      .send({
        walletId: seedId,
    });
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toStrictEqual({
      "xpubkeys": [
        {
          "path": "m/0",
          "xPubKey": "tpubD91aWShAWDihZv8MDnUTBeCorLByKmTtZkDp1oveS5mbpKx8NfGdVLzMLemGkUf4mLWbnYh4uJ1sDMEnS7wxMjyeN5V1zaavLhLXFBFyZSf"
        },
        {
          "path": "m/0'",
          "xPubKey": "tpubD91aWShJqtFfkVVYVy7MKbjUaDq6drkWJRtnJYDeWdo354d8bfRrvH2WP6afX5oF8PgtfDKVLNd53tCkneiYsJvwrTYc5UvhXoJEeDz3bh1"
        },
        {
          "path": "m/0'/0",
          "xPubKey": "tpubDB336hWdU8wPh8osn5r2tMfAS9tFddi8385cYYNxmoPveywUB7Sc933W5ynePX3zSo7yddLCaa5bKt9RWUrDEG9tBf3H8tbdCFUj3zvtQ3E"
        },
        {
          "path": "m/0'/0'",
          "xPubKey": "tpubDB336hWmooUMr6d5fydDSE5SRuqMYu2GboMJN7W1Bu2ohML4kJ2FWcKE3zc6e7nw4VPTsm9b6gg9JXHSGZUmFNNXyxmgTMDHUgzLfG7LzCy"
        },
        {
          "path": "m/0'/0'/0'",
          "xPubKey": "tpubDD6uFgyUvH2iqB8hKdX8NLZqanjpNhk38yfPjWW4L82Yhx6WxFao1xekJBx9W6hyZSBpE54yAmPUEjegTB9DoAxcVfebh8Ck2rJj2xHvP7H"
        },
        {
          "path": "m/44'/0'/0'",
          "xPubKey": "tpubDCnFe4aFbkmx3UzTnqBjrFBgnTJMwTrM9Aub6CZe1nXvNgYYmRdHFEzCcJDBA3X5R6i9z3ZaBpacAEGXsR23pWFeuxp3hdh25MqeNGVYNwr"
        },
        {
          "path": "m/44'/0'/0'/0",
          "xPubKey": "tpubDFWbesvfMfxhNbeAzincx27PYVsecZb2TRac2pXdvpQNEQUiJiZvqqwu58PRjVoEGqdSL1gM8TEGxMrPZh4DVy6GeRnehTjFLtTPKM2SQfb"
        },
        {
          "path": "m/44'/145'/0'",
          "xPubKey": "tpubDDo2Yq1mwM1HDBxiWfv8Gq7yP7UBVEPnKrLrEgXcbMY1jREqH5qcxhqXiqZnCxMyotTWaMfUGu4LGRdW9oEVTKNe48M65Y4khyPKtRxrQuj"
        },
        {
          "path": "m/44'/145'/0'/0",
          "xPubKey": "tpubDEdTFZ3zBajr9TU8C817GzWaCbppADPczTJzhni98wE5qT3ARzRENQqBdW6Y4SnVFrDQvB39PPjGqMgtiZkP2Lue3Yj6yveQV1wACgMaHzu"
        },
        {
          "path": "m/44'/245'/0",
          "xPubKey": "tpubDDDqxcAmqt9W3fkx5uiCa3r8EDFNvPerUKxEjvRkNFAHoEGbzqu4WmdcSBFRd4syiu6aZmcBV9HMhRGC3FpEvydbezABeGw69btyG35L1g2"
        },
        {
          "path": "m/44'/245'/0'",
          "xPubKey": "tpubDDDqxcAvBYgUEeRJmy7RQh8VBvaEZLLxis1k8MJa4TnF9Sct31zi34TCUQ8fLwt2chPvx9yFAJYcJSB1RvPQC1BjuLLPbw5mt3cUKGVAQXr"
        },
        {
          "path": "m/44'/245'/0'/0",
          "xPubKey": "tpubDDyZneHARuhWkYF7qBCtmnUjyXoSVz5ikGsNNBkTmpXVGh6BsVtTWChYF7E89J3fEb52txw7FSTZBvkBhpAdNiceNGaVnCyCgC4r5GTbQdX"
        }
      ]
    });
  });
  it("Should return xpubkeys if provided a path", async () => {

    let resp;


    const seedId = `seed:regtest:abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon:m/44'/0'/0'/0/0`;
    resp = await request(app)
      .post("/wallet/xpubkeys")
      .send({
        walletId: seedId,
        paths: ["m/44'/0'/0'"]
    });
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toStrictEqual({
        "xpubkeys": [
          [
            {
              "path": "m/44'/0'/0'",
              "xPubKey": "tpubDCnFe4aFbkmx3UzTnqBjrFBgnTJMwTrM9Aub6CZe1nXvNgYYmRdHFEzCcJDBA3X5R6i9z3ZaBpacAEGXsR23pWFeuxp3hdh25MqeNGVYNwr"
            }
          ]
        ]
      });
  });

  it("Should encode and submit a transaction", async () => {
    const bobsWalletResp = await request(app).post("/wallet/create").send({
      network: "regtest",
    });
    const bobsCashaddr = bobsWalletResp.body.cashaddr;

    const encodedTransactionResponse = await request(app)
      .post("/wallet/encode_transaction")
      .send({
        walletId: `wif:regtest:${process.env.PRIVATE_WIF}`,
        to: [
          {
            cashaddr: bobsCashaddr,
            unit: 'satoshis',
            value: 2000,
          },
        ],
      });

    expect(encodedTransactionResponse.statusCode).toBe(200);
    expect(encodedTransactionResponse.body.transactionHex?.length).toBeGreaterThan(0);

    const submitTransactionResponse = await request(app).post("/wallet/submit_transaction").send({
      walletId: bobsWalletResp.body.walletId,
      transactionHex: encodedTransactionResponse.body.transactionHex,
    });
    expect(submitTransactionResponse.statusCode).toBe(200);
    expect(submitTransactionResponse.body?.txId?.length).toBeGreaterThan(0);

    const bobBalanceResponse = await request(app)
      .post("/wallet/balance")
      .send({
        walletId: bobsWalletResp.body.walletId,
      });
    expect(bobBalanceResponse.statusCode).toEqual(200);
    expect(bobBalanceResponse.body.sat).toBe(2000);
  });
});
