import server from "../index.js";
import request from "supertest";
import { binToHex, NFTCapability, utf8ToBin } from "mainnet-js";

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
  it("Test fungible cashtoken genesis and sending", async () => {
    const aliceId = process.env.ALICE_ID!;
    const bobResp = (await request(app).post("/wallet/create").send({
      type: "wif",
      network: "regtest",
    })).body;
    const bobId = bobResp.walletId;
    const bobCashaddr = bobResp.cashaddr;

    const category = (await request(app).post("/wallet/token_genesis").send({
      walletId: aliceId,
      amount: 100,
    })).body.categories![0];

    const tokenBalance = (await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance;
    expect(tokenBalance).toBe("100");

    const tokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(tokenUtxos.length).toBe(1);
    await request(app).post("/wallet/send").send({
      walletId: aliceId,
      to: [{
        cashaddr: bobCashaddr,
        amount: 25,
        category: category,
      }, {
        cashaddr: process.env.ADDRESS!,
        amount: 25,
        category: category,
      }]
    });
    const newTokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;

    expect(newTokenUtxos.length).toBe(2);
    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance).toBe("75");
    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: bobId,
      category: category,
    })).body.balance).toBe("25");
  });

  test("Test NFT cashtoken genesis and sending", async () => {
    const aliceId = process.env.ALICE_ID!;
    const bobResp = (await request(app).post("/wallet/create").send({
      type: "wif",
      network: "regtest",
    })).body;
    const bobId = bobResp.walletId;
    const bobCashaddr = bobResp.cashaddr;

    const category = (await request(app).post("/wallet/token_genesis").send({
      walletId: aliceId,
      cashaddr: process.env.ADDRESS!,
      nft: {
        capability: NFTCapability.mutable,
        commitment: "abcd",
      },
    })).body.categories![0];

    const tokenBalance = (await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance;
    expect(tokenBalance).toBe("0");
    const nftTokenBalance = (await request(app).post("/wallet/get_nft_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance;
    expect(nftTokenBalance).toBe(1);

    const tokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(tokenUtxos.length).toBe(1);
    const response = (await request(app).post("/wallet/send").send({
      walletId: aliceId,
      to: [{
        cashaddr: bobCashaddr,
        category: category,
        nft: {
          capability: NFTCapability.mutable,
          commitment: "abcd",
        },
      }]
    })).body;
    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance).toBe("0");
    expect((await request(app).post("/wallet/get_nft_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance).toBe(0);
    const newTokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(newTokenUtxos.length).toBe(0);

    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: bobId,
      category: category,
    })).body.balance).toBe("0");
    const bobTokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: bobId,
      category: category,
    })).body;
    expect(bobTokenUtxos.length).toBe(1);
    expect(category).toEqual(response.categories![0]);
    expect(bobTokenUtxos[0].token?.nft?.commitment).toEqual("abcd");
  });

  test("Test immutable NFT cashtoken genesis and sending, error on mutation", async () => {
    const aliceId = process.env.ALICE_ID!;
    const category = (await request(app).post("/wallet/token_genesis").send({
      walletId: aliceId,
      cashaddr: process.env.ADDRESS!,
      nft: {
        capability: NFTCapability.none,
        commitment: "abcd",
      },
    })).body.categories![0];

    const tokenBalance = (await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance;
    expect(tokenBalance).toBe("0");
    const tokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(tokenUtxos.length).toBe(1);
    const response = (await request(app).post("/wallet/send").send({
      walletId: aliceId,
      to: [{
        cashaddr: process.env.ADDRESS!,
        category: category,
        nft: {
          capability: NFTCapability.none,
          commitment: "abcd02",
        },
      }]
    })).body;
    expect(response.message).toContain("No suitable token utxos available to send token with id");
  });

  test("Test mutable NFT cashtoken genesis and mutation", async () => {
    const aliceId = process.env.ALICE_ID!;
    const category = (await request(app).post("/wallet/token_genesis").send({
      walletId: aliceId,
      cashaddr: process.env.ADDRESS!,
      nft: {
        capability: NFTCapability.mutable,
        commitment: "abcd",
      },
    })).body.categories![0];

    const tokenBalance = (await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance;
    expect(tokenBalance).toBe("0");
    const tokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(tokenUtxos.length).toBe(1);
    const response = (await request(app).post("/wallet/send").send({
      walletId: aliceId,
      to: [{
        cashaddr: process.env.ADDRESS!,
        category: category,
        nft: {
          capability: NFTCapability.mutable,
          commitment: "abcd02",
        },
      }]
    })).body;
    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance).toBe("0");
    const newTokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(newTokenUtxos.length).toBe(1);
    expect(category).toEqual(response.categories![0]);
    expect(newTokenUtxos[0].token?.nft?.commitment).toEqual("abcd02");
  });

  test("Test minting NFT cashtoken genesis and minting", async () => {
    const aliceId = process.env.ALICE_ID!;
    const category = (await request(app).post("/wallet/token_genesis").send({
      walletId: aliceId,
      cashaddr: process.env.ADDRESS!,
      nft: {
      capability: NFTCapability.minting,
        commitment: "abcd",
      },
    })).body.categories![0];

    const tokenBalance = (await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance;
    expect(tokenBalance).toBe("0");
    const tokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(tokenUtxos.length).toBe(1);
    const response = (await request(app).post("/wallet/token_mint").send({
      walletId: aliceId,
      category: category,
      requests: [{
        cashaddr: process.env.ADDRESS!,
        nft: {
          capability: NFTCapability.none,
          commitment: "test",
        },
      }, {
        cashaddr: process.env.ADDRESS!,
        nft: {
          capability: NFTCapability.none,
          commitment: "test",
        },
      }]
    })).body;
    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance).toBe("0");
    const newTokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(newTokenUtxos.length).toBe(3);
    expect(category).toEqual(response.categories![0]);
  });

  test("Test minting NFT and optionally burning FT cashtoken", async () => {
    const aliceId = process.env.ALICE_ID!;
    const category = (await request(app).post("/wallet/token_genesis").send({
      walletId: aliceId,
      cashaddr: process.env.ADDRESS!,
      amount: 4,
      nft: {
      capability: NFTCapability.minting,
        commitment: "abcd",
      },
    })).body.categories![0];

    const tokenBalance = (await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance;
    expect(tokenBalance).toBe("4");
    const tokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(tokenUtxos.length).toBe(1);

    // mint 2 NFTs, amount reducing
    const response = (await request(app).post("/wallet/token_mint").send({
      walletId: aliceId,
      category: category,
      requests: [{
        cashaddr: process.env.ADDRESS!,
        nft: {
          capability: NFTCapability.none,
          commitment: "0a",
        },
      }, {
        cashaddr: process.env.ADDRESS!,
        nft: {
          capability: NFTCapability.none,
          commitment: "0a",
        },
      }],
      deductTokenAmount: true
    })).body;

    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance).toBe("2");
    const newTokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(newTokenUtxos.length).toBe(3);
    expect(category).toEqual(response.categories![0]);

    // mint 2 more NFTs without amount reducing
    const ftResponse = (await request(app).post("/wallet/token_mint").send({
      walletId: aliceId,
      category: category,
      requests: [{
        cashaddr: process.env.ADDRESS!,
        nft: {
          capability: NFTCapability.none,
          commitment: "0c",
        },
      }, {
        cashaddr: process.env.ADDRESS!,
        nft: {
          capability: NFTCapability.none,
          commitment: "0d",
        },
      }],
      deductTokenAmount: false
    })).body;
    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance).toBe("2");
    const ftTokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(ftTokenUtxos.length).toBe(5);
    expect(category).toEqual(ftResponse.categories![0]);

    // we are going to hit amount -1, when minting 3 more NFTs
    // check that it will stop at 0
    const ft2Response = (await request(app).post("/wallet/token_mint").send({
      walletId: aliceId,
      category: category,
      requests: [{
        cashaddr: process.env.ADDRESS!,
        nft: {
          capability: NFTCapability.none,
          commitment: "0a",
        },
      }, {
        cashaddr: process.env.ADDRESS!,
        nft: {
          capability: NFTCapability.none,
          commitment: "0a",
        },
      }, {
        cashaddr: process.env.ADDRESS!,
        nft: {
          capability: NFTCapability.none,
          commitment: "0a",
        },
      }],
      deductTokenAmount: true
    })).body;
    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance).toBe("0");
    const ft2TokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(ft2TokenUtxos.length).toBe(8);
    expect(category).toEqual(ft2Response.categories![0]);
  });

  test("Test explicit burning of FT", async () => {
    const aliceId = process.env.ALICE_ID!;
    const category = (await request(app).post("/wallet/token_genesis").send({
      walletId: aliceId,
      cashaddr: process.env.ADDRESS!,
      amount: 4n,
    })).body.categories![0];

    const tokenBalance = (await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance;
    expect(tokenBalance).toBe("4");
    const tokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(tokenUtxos.length).toBe(1);

    // burn 5 FT
    const response = (await request(app).post("/wallet/token_burn").send({
      walletId: aliceId,
      category: category,
      amount: 5n,
      message: "burn"
    })).body;

    const rawTx = (await request(app).post("/wallet/util/get_raw_transaction").send({
      txHash: response.txId,
      network: "regtest",
      verbose: true,
    })).body;

    expect(rawTx!.vout.length).toEqual(3);
    expect(rawTx!.vout[0].scriptPubKey.type).toEqual("nulldata");
    expect(rawTx!.vout[0].scriptPubKey.hex).toContain(
      binToHex(utf8ToBin("burn"))
    );
    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance).toBe("0");
    const newTokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(newTokenUtxos.length).toBe(0);
    expect(category).toEqual(response.categories![0]);
  });

  test("Test explicit burning of FT+NFT", async () => {
    const aliceId = process.env.ALICE_ID!;
    const category = (await request(app).post("/wallet/token_genesis").send({
      walletId: aliceId,
      cashaddr: process.env.ADDRESS!,
      amount: 4n,
      nft: {
        capability: NFTCapability.minting,
        commitment: "abcd",
      },
    })).body.categories![0];

    const tokenBalance = (await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance;
    expect(tokenBalance).toBe("4");
    const tokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(tokenUtxos.length).toBe(1);

    // burn 1 FT
    const response = (await request(app).post("/wallet/token_burn").send({
      walletId: aliceId,
      category: category,
      amount: 1n,
      nft: {
        capability: NFTCapability.minting,
        commitment: "abcd",
      },
      message: "burn",
    })).body;

    const rawTx = (await request(app).post("/wallet/util/get_raw_transaction").send({
      txHash: response.txId,
      network: "regtest",
      verbose: true,
    })).body;
    expect(rawTx!.vout.length).toEqual(3);
    expect(rawTx!.vout[0].scriptPubKey.type).toEqual("nulldata");
    expect(rawTx!.vout[0].scriptPubKey.hex).toContain(
      binToHex(utf8ToBin("burn"))
    );
    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance).toBe("3");
    expect(((await request(app).post("/wallet/get_all_token_balances").send({
      walletId: aliceId,
    })).body)[category]).toBe("3");
    const newTokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(newTokenUtxos.length).toBe(1);
    expect(((await request(app).post("/wallet/get_nft_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance)).toBe(1);
    expect(((await request(app).post("/wallet/get_all_nft_token_balances").send({
      walletId: aliceId,
    })).body)[category || 0]).toBe(1);
    expect(category).toEqual(response.categories![0]);

    // burn the rest FTs
    const ftResponse = (await request(app).post("/wallet/token_burn").send({
      walletId: aliceId,
      category: category,
      amount: 5n,
      nft: {
        capability: NFTCapability.minting,
        commitment: "abcd",
      },
      message: "burn",
    })).body;
    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance).toBe("0");
    const ftTokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(ftTokenUtxos.length).toBe(1);
    expect(category).toEqual(ftResponse.categories![0]);

    // burn the NFT too
    const nftResponse = (await request(app).post("/wallet/token_burn").send({
      walletId: aliceId,
      category: category,
      nft: {
        capability: NFTCapability.minting,
        commitment: "abcd",
      },
      message: "burn",
    })).body;
    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance).toBe("0");
    expect(((await request(app).post("/wallet/get_all_token_balances").send({
      walletId: aliceId,
    })).body)[category] || 0).toBe(0);
    const nftTokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      category: category,
    })).body;
    expect(nftTokenUtxos.length).toBe(0);
    expect(category).toEqual(nftResponse.categories![0]);
    expect(((await request(app).post("/wallet/get_nft_token_balance").send({
      walletId: aliceId,
      category: category,
    })).body.balance)).toBe(0);
    expect(((await request(app).post("/wallet/get_all_nft_token_balances").send({
      walletId: aliceId,
    })).body)[category] || 0).toBe(0);
  });

  test("Test cashtoken satoshi values and fee calculations", async () => {
    const aliceId = process.env.ALICE_ID!;
    const bobResp = (await request(app).post("/wallet/create").send({
      type: "wif",
      network: "regtest",
    })).body;
    const bobId = bobResp.walletId;
    const bobCashaddr = bobResp.cashaddr;

    const category = (await request(app).post("/wallet/token_genesis").send({
      walletId: aliceId,
      amount: 100,
      value: 7000,
      cashaddr: bobCashaddr,
    })).body.categories![0];

    const tokenBalance = (await request(app).post("/wallet/get_token_balance").send({
      walletId: bobId,
      category: category,
    })).body.balance;
    expect(tokenBalance).toBe("100");
    const tokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: bobId,
      category: category,
    })).body;
    expect(tokenUtxos.length).toBe(1);
    expect(Number(tokenUtxos[0].satoshis)).toBe(7000);

    // lower the token satoshi value
    await request(app).post("/wallet/send").send({
      walletId: bobId,
      to: [{
        cashaddr: bobCashaddr,
        amount: 100,
        category: category,
        value: 1500,
      }]
    });

    let newTokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: bobId,
      category: category,
    })).body;
    expect(newTokenUtxos.length).toBe(1);
    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: bobId,
      category: category,
    })).body.balance).toBe("100");

    let bobUtxos = (await request(app).post("/wallet/utxo").send({
      walletId: bobId,
    })).body;
    expect(bobUtxos.length).toBe(2);
    expect(Number(bobUtxos[0].satoshis)).toBe(1500);
    expect(Number(bobUtxos[1].satoshis)).toBe(5245);

    // raise the token satoshi value
    await request(app).post("/wallet/send").send({
      walletId: bobId,
      to: [{
        cashaddr: bobCashaddr,
        amount: 100,
        category: category,
        value: 3000,
      }]
    });
    newTokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: bobId,
      category: category,
    })).body;
    expect(newTokenUtxos.length).toBe(1);
    expect((await request(app).post("/wallet/get_token_balance").send({
      walletId: bobId,
      category: category,
    })).body.balance).toBe("100");

    bobUtxos = (await request(app).post("/wallet/utxo").send({
      walletId: bobId,
    })).body;
    expect(bobUtxos.length).toBe(2);
    expect(Number(bobUtxos[0].satoshis)).toBe(3000);
    expect(Number(bobUtxos[1].satoshis)).toBe(3349);
  });
});
