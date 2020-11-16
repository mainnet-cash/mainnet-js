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
   * integration test for create & spend
   */
  it("Should should allow buyer to release funds", async () => {
    let buyerId = `wif:regtest:${process.env.PRIVATE_WIF}`
    let buyer =  (await RegTestWallet.fromId(buyerId)) as RegTestWallet
    let arbiter = (await RegTestWallet.watchOnly("bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8")) as RegTestWallet
    let seller = (await RegTestWallet.watchOnly('bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e')) as RegTestWallet
    
    const contractResp = await request(app).post("/contract/escrow/create").send({
      buyerAddr: buyer.getDepositAddress(),
      arbiterAddr: arbiter.getDepositAddress(),
      sellerAddr: seller.getDepositAddress()
    });
    
    expect(contractResp.statusCode).toEqual(200);
    expect(contractResp.body.contractId).toEqual("escrow:bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e:bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0:bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8");
    expect(contractResp.body.address).toEqual("bchreg:pzcrzldz5vdyr6w4kx6vrktslh2nqaf6zvw7n009wy");
    
    let contractId = contractResp.body.contractId
    let contractAddress = contractResp.body.address


    const sendResp = await request(app)
        .post("/wallet/send")
        .send({
          walletId: buyerId,
          to: [
            {
              cashaddr: contractAddress,
              unit: 'satoshis',
              value: 20000,
            },
          ],
        });

    const respSpend = await request(app).post("/contract/escrow/call").send({
      contractId: contractId,
      walletId: buyerId,
      action: "spend"
    });
    
    expect(respSpend.statusCode).toEqual(200);
    expect(respSpend.body.txId.length).toEqual(64);
    expect(respSpend.body.hex.length).toBeGreaterThan(1000);

    const resp = await request(app)
      .post("/wallet/balance")
      .send({
        walletId: `watch:regtest:${seller.getDepositAddress()}`,
      });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.sat).toBeGreaterThan(18000);

  });

  /**
   * integration test for create and utxos 
   */
  it("Should should get utxos on a contract address", async () => {
    let buyerId = `wif:regtest:${process.env.PRIVATE_WIF}`
    let buyer =  (await RegTestWallet.fromId(buyerId)) as RegTestWallet
    let arbiter = (await RegTestWallet.watchOnly("bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8")) as RegTestWallet
    let seller = (await RegTestWallet.watchOnly('bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e')) as RegTestWallet
    
    const contractResp = await request(app).post("/contract/escrow/create").send({
      buyerAddr: buyer.getDepositAddress(),
      arbiterAddr: arbiter.getDepositAddress(),
      sellerAddr: seller.getDepositAddress()
    });
    
    expect(contractResp.statusCode).toEqual(200);
    expect(contractResp.body.contractId).toEqual("escrow:bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e:bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0:bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8");
    expect(contractResp.body.address).toEqual("bchreg:pzcrzldz5vdyr6w4kx6vrktslh2nqaf6zvw7n009wy");
    
    let contractId = contractResp.body.contractId
    let contractAddress = contractResp.body.address


    const sendResp = await request(app)
        .post("/wallet/send")
        .send({
          walletId: buyerId,
          to: [
            {
              cashaddr: contractAddress,
              unit: 'satoshis',
              value: 20000,
            },
          ],
        });

    const utxoResp = await request(app).post("/contract/escrow/utxos").send({
      contractId: contractId,
    });
    
    expect(utxoResp.statusCode).toEqual(200);
    expect(utxoResp.body["0"].txid.length).toEqual(64);


  });
  
});
