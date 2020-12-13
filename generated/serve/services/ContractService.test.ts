var server = require("../")
import { RegTestWallet } from "../../../src/wallet/Wif";
import { serializeUtxo } from "../../../src/util/serializeUtxo"
import { UtxoI } from "../../../src/interface";
var request = require("supertest");


var app;

describe("Test Contract Services", () => {

  beforeAll(async function () {
    app = await server.getServer().launch();  
  });
  afterAll(async function () {
    await server.killElectrum()
    app.close();
  });

  /**
   * integration test for create & spend
   */
  it("Should should allow buyer to release funds", async () => {
    let buyerId = `wif:regtest:${process.env.PRIVATE_WIF}`
    let buyer =  await RegTestWallet.fromId(buyerId)
    let arbiter = await RegTestWallet.watchOnly("bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8")
    let seller = await RegTestWallet.watchOnly('bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e')
    
    const contractResp = await request(app).post("/contract/escrow/create").send({
      buyerAddr: buyer.getDepositAddress(),
      arbiterAddr: arbiter.getDepositAddress(),
      sellerAddr: seller.getDepositAddress(),
      amount: 16000,
      nonce: 3
    });
    
    
    expect(contractResp.statusCode).toEqual(200);
    expect(contractResp.body.contractId.slice(0,198)).toEqual("regtest␝MjQxLDIyLDUzLDIzMiwyMjksMjUzLDE4NSwxNTEsNSwxMDMsMjMyLDExMywxNTUsNzgsMTk1LDEwLDE3NSwxODIsMTU4LDIzMg==␞ODYsMTgyLDE3OCwzMiw2NiwxODUsMTMsMjE0LDEyMywyNDIsMjUxLDI1MSwxNTQsMjU1LDEyNSw1NSwyNTEsMjM4L");
    expect(contractResp.body.cashaddr).toEqual("bchreg:ppeuugad5yac7yv3zy2a4eautgt8tsmzg5spak929e");
    
    let contractId = contractResp.body.contractId
    let contractAddress = contractResp.body.cashaddr


    const sendResp = await request(app)
        .post("/wallet/send")
        .send({
          walletId: buyerId,
          to: [
            {
              cashaddr: contractAddress,
              unit: 'satoshis',
              value: 21000,
            },
          ],
        });

    const respSpend = await request(app).post("/contract/escrow/call").send({
      contractId: contractId,
      walletId: buyerId,
      action: "spend",
      to: seller.getDepositAddress(),
      nonce: 3
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
    expect(resp.body.sat).toBeGreaterThan(16700);

  });

  /**
   * integration test for create and utxos 
   */
  it("Should should get utxos on a contract address", async () => {
    let buyerId = `wif:regtest:${process.env.PRIVATE_WIF}`
    let buyer =  await RegTestWallet.fromId(buyerId)
    let arbiter = await RegTestWallet.watchOnly("bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8")
    let seller = await RegTestWallet.watchOnly('bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e')
    
    const contractResp = await request(app).post("/contract/escrow/create").send({
      buyerAddr: buyer.getDepositAddress(),
      arbiterAddr: arbiter.getDepositAddress(),
      sellerAddr: seller.getDepositAddress(),
      amount: 16000,
      nonce: 1
    });
    
    expect(contractResp.statusCode).toEqual(200);
    expect(contractResp.body.contractId.slice(0,198)).toEqual("regtest␝MjQxLDIyLDUzLDIzMiwyMjksMjUzLDE4NSwxNTEsNSwxMDMsMjMyLDExMywxNTUsNzgsMTk1LDEwLDE3NSwxODIsMTU4LDIzMg==␞ODYsMTgyLDE3OCwzMiw2NiwxODUsMTMsMjE0LDEyMywyNDIsMjUxLDI1MSwxNTQsMjU1LDEyNSw1NSwyNTEsMjM4L");
    expect(contractResp.body.cashaddr).toEqual("bchreg:ppjc0aqrc2stmhran90twhevfnhul9wanvgnffd5lp");
    
    let contractId = contractResp.body.contractId
    let contractAddress = contractResp.body.cashaddr


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


  /**
   * integration test for spending from specific utxo
   */
  it("Should should allow buyer to release funds from specific utxos", async () => {
    let buyerId = `wif:regtest:${process.env.PRIVATE_WIF}`
    let buyer =  await RegTestWallet.fromId(buyerId)
    let arbiter = await RegTestWallet.watchOnly("bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8")
    let seller = await RegTestWallet.watchOnly('bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e')
    
    const contractResp = await request(app).post("/contract/escrow/create").send({
      buyerAddr: buyer.getDepositAddress(),
      arbiterAddr: arbiter.getDepositAddress(),
      sellerAddr: seller.getDepositAddress(),
      amount: 16000,
      nonce: 6
    });
    
    
    expect(contractResp.statusCode).toEqual(200);
    expect(contractResp.body.contractId.slice(0,198)).toEqual("regtest␝MjQxLDIyLDUzLDIzMiwyMjksMjUzLDE4NSwxNTEsNSwxMDMsMjMyLDExMywxNTUsNzgsMTk1LDEwLDE3NSwxODIsMTU4LDIzMg==␞ODYsMTgyLDE3OCwzMiw2NiwxODUsMTMsMjE0LDEyMywyNDIsMjUxLDI1MSwxNTQsMjU1LDEyNSw1NSwyNTEsMjM4L");
    expect(contractResp.body.cashaddr).toEqual("bchreg:pr3rrjygr2nl259n8u8p7tkywpawm0zdyyw44kwcv6");
    
    let contractId = contractResp.body.contractId
    let contractAddress = contractResp.body.cashaddr


    const sendResp = await request(app)
        .post("/wallet/send")
        .send({
          walletId: buyerId,
          to: [
            {
              cashaddr: contractAddress,
              unit: 'satoshis',
              value: 21000,
            },
          ],
        });

    const sendResp2 = await request(app)
        .post("/wallet/send")
        .send({
          walletId: buyerId,
          to: [
            {
              cashaddr: contractAddress,
              unit: 'satoshis',
              value: 21000,
            },
          ],
        });

    const utxoResp = await request(app).post("/contract/escrow/utxos").send({
      contractId: contractId,
    });
    
    expect(utxoResp.statusCode).toEqual(200);
    expect(utxoResp.body["1"].satoshis).toEqual(21000);
    
    let utxos = [serializeUtxo(utxoResp.body["1"] as UtxoI)]

    const respSpend = await request(app).post("/contract/escrow/call").send({
      contractId: contractId,
      walletId: buyerId,
      action: "spend",
      to: seller.getDepositAddress(),
      utxoIds: utxos,
      nonce: 6
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
    expect(resp.body.sat).toBeGreaterThan(16700);
    const utxo2Resp = await request(app).post("/contract/escrow/utxos").send({
      contractId: contractId,
    });
    
    expect(utxo2Resp.statusCode).toEqual(200);
    expect(utxo2Resp.body["0"].satoshis).toEqual(21000);

  });

  
});
