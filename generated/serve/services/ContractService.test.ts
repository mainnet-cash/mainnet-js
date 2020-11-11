var server = require("../")
import { RegTestWallet } from "../../../src/wallet/Wif";
var request = require("supertest");

var app;

describe("Test Contract Services", () => {

  beforeAll(async function () {
    app = await server.getServer().launch();  
  });
  afterEach(function () {
    app.close();
  });

  /**
   * test mining blocks
   */
  it("Should mine a number of blocks to a given address", async () => {
    let funder = (await RegTestWallet.fromWIF(
        process.env.PRIVATE_WIF
      )) as RegTestWallet
      funder.send
    let buyer =  (await RegTestWallet.newRandom()) as RegTestWallet
    let arbiter = (await RegTestWallet.newRandom()) as RegTestWallet
    let seller = (await RegTestWallet.newRandom()) as RegTestWallet
    await funder.send([
        {
          cashaddr: buyer.getDepositAddress()!,
          value: 500000,
          unit: "satoshis",
        },
      ]);

    const contractResp = await request(app).post("/contract/escrow/create").send({
      buyerAddr: buyer.getDepositAddress(),
      arbiterAddr: arbiter.getDepositAddress(),
      sellerAddr: seller.getDepositAddress()
    });

    expect(contractResp.statusCode).toEqual(200);
    
    
    // const contractId = contractResp.body.contractId;
    // const resp = await request(app).post("/contract/escrow/call").send({
    //   contractId: contractId,
    //   walletId: buyer.toString(),
    //   method: "spendByBuyer",
    // });

    // await new Promise((resolve) => setTimeout(resolve, 2000));
    // const bobBalanceResp = await request(app).post("/contract/escrow/balance").send({
    //   walletId: bobsWalletResp.body.walletId,
    // });

    // expect(resp.statusCode).toEqual(200);
    // expect(resp.body.length).toEqual(15);
    // expect(bobBalanceResp.body.bch).toBeGreaterThanOrEqual(50 * 15);
  });
});
