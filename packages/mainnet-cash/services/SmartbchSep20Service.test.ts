import server from "..";
import request from "supertest";
import { HttpError } from "express-openapi-validator/dist/framework/types";

var app;

function checkStatus(resp) {;
  if (resp.statusCode !== 200) {
    throw resp.body;
  }
}

describe.skip("Test Wallet SmartBch Sep20 Endpoints", () => {
  beforeAll(async function () {
    app = await server.getServer().launch();
  });
  afterAll(async function () {
    await server.killElectrum()
    app.close();
  });

  test("SEP20 genesis and info", async () => {
    const options = {
      name: "Mainnet Coin",
      ticker: "MNC",
      decimals: 8,
      initialAmount: 10,
    };

    const overrides = { gasPrice: 10 ** 10 };

    const watchOnlyResponce = await request(app)
      .post("/smartbch/sep20/genesis")
      .send({
        walletId: `watch:regtest:${process.env.SBCH_ALICE_ADDRESS}`,
        ...options,
        overrides: overrides
      });

    expect((watchOnlyResponce.error as any).text).toMatch("Cannot deploy contracts with Watch-Only wallets");

    const resp = await request(app)
      .post("/smartbch/sep20/genesis")
      .send({
        walletId: `${process.env.SBCH_ALICE_ID}`,
        ...options,
        overrides: overrides
      });

    expect(resp.statusCode).toEqual(200);
    const result = resp.body;

    expect(result.tokenId.length).toBe(42);
    expect(Number(result.balance.value)).toBe(10);
    expect(result.balance.name).toBe(options.name);
    expect(result.balance.ticker).toBe(options.ticker);
    expect(result.balance.decimals).toBe(options.decimals);
    expect(result.tokenId).toBe(result.balance.tokenId);

    // get token info
    const tokenInfoResponse = await request(app)
      .post("/smartbch/sep20/token_info")
      .send({
        walletId: `${process.env.SBCH_ALICE_ID}`,
        tokenId: result.tokenId,
      });
    expect(tokenInfoResponse.status).toBe(200);

    const tokenInfo = tokenInfoResponse.body;
    expect(tokenInfo.name).toBe(options.name);
    expect(tokenInfo.ticker).toBe(options.ticker);
    expect(tokenInfo.decimals).toBe(options.decimals);
    expect(tokenInfo.tokenId).toBe(result.tokenId);
    expect(Number(tokenInfo.totalSupply)).toBe(10);

    // send
    const bobWalletId = `privkey:regtest:0x17e40d4ce582a9f601e2a54d27c7268d6b7b4b865e1204bda15778795b017bff`;
    const bobAddressResponse = await request(app)
      .post("/smartbch/wallet/deposit_address")
      .send({
        walletId: bobWalletId,
      });
    const bobAddress = bobAddressResponse.body.address;

    const sendResultResponse = await request(app)
      .post("/smartbch/sep20/send")
      .send({
        walletId: `${process.env.SBCH_ALICE_ID}`,
        to: [
          {
            address: bobAddress,
            tokenId: result.tokenId,
            value: 3,
          },
        ],
        overrides: overrides
      });
    expect(sendResultResponse.status).toBe(200);

    const sendResult = sendResultResponse.body;
    expect(Number(sendResult[0].balance.value)).toBe(7);

    let bobBalanceResponse = await request(app)
      .post("/smartbch/sep20/balance")
      .send({
        walletId: bobWalletId,
        tokenId: result.tokenId,
      });

    expect(Number(bobBalanceResponse.body.value)).toBe(3);

    const charlieResponse = await request(app)
      .post("/smartbch/wallet/create")
      .send({
        type : "privkey",
        network: "regtest"
      });

    const daveResponse = await await request(app)
      .post("/smartbch/wallet/create")
      .send({
        type : "privkey",
        network: "regtest"
      });

    const sendManyResultResponse = await request(app)
      .post("/smartbch/sep20/send")
      .send({
        walletId: `${process.env.SBCH_ALICE_ID}`,
        to: [
          {
            address: charlieResponse.body.address,
            tokenId: result.tokenId,
            value: 1,
          },
          {
            address: daveResponse.body.address,
            tokenId: result.tokenId,
            value: 2,
          },
        ],
        overrides: overrides
      });
    expect(sendManyResultResponse.status).toBe(200);

    let aliceBalanceResponse = await request(app)
      .post("/smartbch/sep20/balance")
      .send({
        walletId: `${process.env.SBCH_ALICE_ID}`,
        tokenId: result.tokenId,
      });

    expect(Number(aliceBalanceResponse.body.value)).toBe(4);

    const charlieBalanceResponse = await request(app)
      .post("/smartbch/sep20/balance")
      .send({
        walletId: charlieResponse.body.walletId,
        tokenId: result.tokenId,
      });

    expect(Number(charlieBalanceResponse.body.value)).toBe(1);
    const daveBalanceResponse = await request(app)
      .post("/smartbch/sep20/balance")
      .send({
        walletId: daveResponse.body.walletId,
        tokenId: result.tokenId,
      });

    let charlieBalancesResponse = await request(app)
      .post("/smartbch/sep20/all_balances")
      .send({
        walletId: charlieResponse.body.walletId,
        options: { forceRescan: true, hideEmpty: true },
      });

    expect(charlieBalancesResponse.body.length).toBe(1);
    expect(Number(charlieBalancesResponse.body[0].value)).toBe(1);


    expect(Number(daveBalanceResponse.body.value)).toBe(2);

    // sendMax
    const sendMaxResultResponse = await request(app)
      .post("/smartbch/sep20/send_max")
      .send({
        walletId: bobWalletId,
        address: process.env.SBCH_ALICE_ADDRESS,
        tokenId: result.tokenId,
        overrides: overrides
      });

    const sendMaxResult = sendMaxResultResponse.body;
    expect(Number(sendMaxResult.balance.value)).toBe(0);

    aliceBalanceResponse = await request(app)
      .post("/smartbch/sep20/balance")
      .send({
        walletId: `${process.env.SBCH_ALICE_ID}`,
        tokenId: result.tokenId,
      });

    expect(Number(aliceBalanceResponse.body.value)).toBe(7);

    bobBalanceResponse = await request(app)
      .post("/smartbch/sep20/balance")
      .send({
        walletId: bobWalletId,
        tokenId: result.tokenId,
      });

    expect(Number(bobBalanceResponse.body.value)).toBe(0);
  });

  test("SEP20 genesis with token receiver and baton receiver", async () => {
    const bobWalletId = `privkey:regtest:0x17e40d4ce582a9f601e2a54d27c7268d6b7b4b865e1204bda15778795b017bff`;
    const bobAddressResponse = await request(app)
      .post("/smartbch/wallet/deposit_address")
      .send({
        walletId: bobWalletId,
      });
    const bobAddress = bobAddressResponse.body.address;

    const options = {
      name: "Mainnet Coin",
      ticker: "MNC",
      decimals: 8,
      initialAmount: 10,
      tokenReceiverAddress: bobAddress,
      batonReceiverAddress: bobAddress,
    };

    const overrides = { gasPrice: 10 ** 10 };

    const resp = await request(app)
      .post("/smartbch/sep20/genesis")
      .send({
        walletId: `${process.env.SBCH_ALICE_ID}`,
        ...options,
        overrides: overrides
      });

    expect(resp.statusCode).toEqual(200);
    const result = resp.body;

    expect(Number(result.balance.value)).toBe(0);
    expect(result.balance.name).toBe(options.name);
    expect(result.balance.ticker).toBe(options.ticker);
    expect(result.balance.decimals).toBe(options.decimals);
    expect(result.tokenId).toBe(result.balance.tokenId);

    let aliceBalanceResponse = await request(app)
      .post("/smartbch/sep20/balance")
      .send({
        walletId: `${process.env.SBCH_ALICE_ID}`,
        tokenId: result.tokenId,
      });

    expect(Number(aliceBalanceResponse.body.value)).toBe(0);

    let bobBalanceResponse = await request(app)
      .post("/smartbch/sep20/balance")
      .send({
        walletId: bobWalletId,
        tokenId: result.tokenId,
      });

    expect(Number(bobBalanceResponse.body.value)).toBe(10);

    // mint
    const mintResultResponse = await request(app)
      .post("/smartbch/sep20/mint")
      .send({
        walletId: bobWalletId,
        tokenId: result.tokenId,
        value: 5,
        tokenReceiverAddress: bobAddress,
        overrides: overrides
    });
    const mintResult = mintResultResponse.body;

    expect(Number(mintResult.balance.value)).toStrictEqual(15);

    // mint fail, no role
    const mintFailResponse = await request(app)
      .post("/smartbch/sep20/mint")
      .send({
        walletId: process.env.SBCH_ALICE_ID,
        tokenId: result.tokenId,
        value: 5,
        tokenReceiverAddress: process.env.SBCH_ALICE_ADDRESS,
        overrides: overrides
    });
    expect((mintFailResponse.error as any).text).toMatch("is not allowed to mint or minting is not supported by the contract");
  });

  test("SEP20 mint disabled (baton ended)", async () => {
    const options = {
      name: "Mainnet Coin",
      ticker: "MNC",
      decimals: 8,
      initialAmount: 10,
      endBaton: true,
    };

    const overrides = { gasPrice: 10 ** 10 };

    const resp = await request(app)
      .post("/smartbch/sep20/genesis")
      .send({
        walletId: `${process.env.SBCH_ALICE_ID}`,
        ...options,
        overrides: overrides
      });

    expect(resp.statusCode).toEqual(200);
    const result = resp.body;

    expect(Number(result.balance.value)).toBe(10);
    expect(result.balance.name).toBe(options.name);
    expect(result.balance.ticker).toBe(options.ticker);
    expect(result.balance.decimals).toBe(options.decimals);
    expect(result.tokenId).toBe(result.balance.tokenId);

    // mint fail, mint was disabled by genesis options
    const mintFailResponse = await request(app)
      .post("/smartbch/sep20/mint")
      .send({
        walletId: process.env.SBCH_ALICE_ID,
        tokenId: result.tokenId,
        value: 5,
        tokenReceiverAddress: process.env.SBCH_ALICE_ADDRESS,
        overrides: overrides
    });
    expect((mintFailResponse.error as any).text).toMatch("is not allowed to mint or minting is not supported by the contract");
  });
});
