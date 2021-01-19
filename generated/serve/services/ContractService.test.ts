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
  it("Should allow buyer to release funds", async () => {
    let buyerId = `wif:regtest:${process.env.PRIVATE_WIF}`
    let buyer =  await RegTestWallet.fromId(buyerId)
    let arbiter = await RegTestWallet.watchOnly("bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8")
    let seller = await RegTestWallet.watchOnly('bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e')
    
    const contractResp = await request(app).post("/contract/escrow/create").send({
      buyerAddr: buyer.getDepositAddress(),
      arbiterAddr: arbiter.getDepositAddress(),
      sellerAddr: seller.getDepositAddress(),
      amount: 16000
    });
    
    
    expect(contractResp.statusCode).toEqual(200);
    expect(contractResp.body.contractId).toMatch(/regtest:\w+/);
    expect(contractResp.body.cashaddr).toMatch(/bchreg:[p|q]/);
    
    let contractId = contractResp.body.contractId
    let contractAddress = contractResp.body.cashaddr


    await request(app)
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
      method: "spend",
      to: seller.getDepositAddress()
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
   * Should return transaction when getHexOnly is passed
   */
  it("Should allow getting hex only from spend request", async () => {
    let buyerId = `wif:regtest:${process.env.PRIVATE_WIF}`
    let buyer =  await RegTestWallet.fromId(buyerId)
    let arbiter = await RegTestWallet.watchOnly("bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8")
    let seller = await RegTestWallet.watchOnly('bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e')
    
    const contractResp = await request(app).post("/contract/escrow/create").send({
      buyerAddr: buyer.getDepositAddress(),
      arbiterAddr: arbiter.getDepositAddress(),
      sellerAddr: seller.getDepositAddress(),
      amount: 16000
    });
    

    expect(contractResp.statusCode).toEqual(200);
    expect(contractResp.body.contractId).toMatch(/regtest:\w+/);
    expect(contractResp.body.cashaddr).toMatch(/bchreg:[p|q]/);
    
    let contractId = contractResp.body.contractId
    let contractAddress = contractResp.body.cashaddr


    await request(app)
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

    const respHex = await request(app).post("/contract/escrow/call").send({
      contractId: contractId,
      walletId: buyerId,
      method: "spend",
      getHexOnly: true,
      to: seller.getDepositAddress()
    });
    
    expect(respHex.statusCode).toEqual(200);
    expect(respHex.body.hex).toMatch(/020000000[0-9a-f]+/);

    const resp = await request(app)
      .post("/wallet/balance")
      .send({
        walletId: `watch:regtest:${contractAddress}`,
      });
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.sat).toBeGreaterThan(16700);

  });

  /**
   * integration test for create and utxos 
   */
  it("Should get utxos on a contract address", async () => {
    let buyerId = `wif:regtest:${process.env.PRIVATE_WIF}`
    let buyer =  await RegTestWallet.fromId(buyerId)
    let arbiter = await RegTestWallet.watchOnly("bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8")
    let seller = await RegTestWallet.watchOnly('bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e')
    
    const contractResp = await request(app).post("/contract/escrow/create").send({
      buyerAddr: buyer.getDepositAddress(),
      arbiterAddr: arbiter.getDepositAddress(),
      sellerAddr: seller.getDepositAddress(),
      amount: 16000
    });
    expect(contractResp.statusCode).toEqual(200);
    expect(contractResp.body.contractId).toMatch(/regtest:\w+/);
    expect(contractResp.body.cashaddr).toMatch(/bchreg:[p|q]/);
    
    let contractId = contractResp.body.contractId
    let contractAddress = contractResp.body.cashaddr


    await request(app)
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

    const utxoResp = await request(app).post("/contract/utxos").send({
      contractId: contractId,
    });
    expect(utxoResp.statusCode).toEqual(200);
    expect(utxoResp.body["0"].txid.length).toEqual(64);


  });


  /**
   * integration test for spending from specific utxo
   */
  it("Should allow buyer to release funds from specific utxos", async () => {
    let buyerId = `wif:regtest:${process.env.PRIVATE_WIF}`
    let buyer =  await RegTestWallet.fromId(buyerId)
    let arbiter = await RegTestWallet.watchOnly("bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8")
    let seller = await RegTestWallet.watchOnly('bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e')
    
    const contractResp = await request(app).post("/contract/escrow/create").send({
      buyerAddr: buyer.getDepositAddress(),
      arbiterAddr: arbiter.getDepositAddress(),
      sellerAddr: seller.getDepositAddress(),
      amount: 16000
    });
    
    expect(contractResp.statusCode).toEqual(200);
    expect(contractResp.body.contractId).toMatch(/regtest:\w+/);
    expect(contractResp.body.cashaddr).toMatch(/bchreg:[p|q]/);
    
    let contractId = contractResp.body.contractId
    let contractAddress = contractResp.body.cashaddr


    await request(app)
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

    await request(app)
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

    const utxoResp = await request(app).post("/contract/utxos").send({
      contractId: contractId,
    });

    expect(utxoResp.statusCode).toEqual(200);
    expect(utxoResp.body["1"].satoshis).toEqual(21000);
    
    let utxos = [serializeUtxo(utxoResp.body["1"] as UtxoI)]

    const respSpend = await request(app).post("/contract/escrow/call").send({
      contractId: contractId,
      walletId: buyerId,
      method: "spend",
      to: seller.getDepositAddress(),
      utxoIds: utxos
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
    const utxo2Resp = await request(app).post("/contract/utxos").send({
      contractId: contractId,
    });
    
    expect(utxo2Resp.statusCode).toEqual(200);
    expect(utxo2Resp.body["0"].satoshis).toEqual(21000);

  });

  /**
   * integration test for spending with timeout 
   */
  it("Should allow spender to reclaim funds after timeout", async () => {
    
    let sender =  await RegTestWallet.fromId(`wif:regtest:${process.env.PRIVATE_WIF}`)
    let receiver = await RegTestWallet.watchOnly("bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8")
    
    let script = `contract TransferWithTimeout(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
      function transfer(pubkey signingPk, sig s) {
        require(checkSig(s, signingPk));
        require(hash160(signingPk) == recipientPkh);
      }
  
      function timeout(pubkey signingPk, sig s) {
        require(checkSig(s, signingPk));
        require(hash160(signingPk) == senderPkh);
        require(tx.time >= timeout);
      }
    }`;

    const contractResp = await request(app).post("/contract/create").send({
      script: script,
      parameters: [sender.getPublicKeyHash(true), receiver.getPublicKeyHash(true), "215"],
      network: 'regtest'
    });
    
    expect(contractResp.statusCode).toEqual(200);
    expect(contractResp.body.contractId).toMatch(/regtest:\w+/);
    expect(contractResp.body.cashaddr).toMatch(/bchreg:[p|q]/);
    
    let contractId = contractResp.body.contractId
    let contractAddress = contractResp.body.cashaddr


    await request(app)
        .post("/wallet/send")
        .send({
          walletId: sender.toString(),
          to: [
            {
              cashaddr: contractAddress,
              unit: 'satoshis',
              value: 21000,
            },
          ],
        });


    const utxoResp = await request(app).post("/contract/utxos").send({
      contractId: contractId,
    });

    expect(utxoResp.statusCode).toEqual(200);
    expect(utxoResp.body["0"].satoshis).toEqual(21000);
    
    let utxos = [serializeUtxo(utxoResp.body["0"] as UtxoI)]

    const respSpend = await request(app).post("/contract/call").send({
      contractId: contractId,
      action: "send",
      function: "timeout",
      arguments: [sender.getPublicKeyCompressed(true), sender.toString()],
      to: {
        to: sender.getDepositAddress(),
        amount: 17000,
      },
    }
    );
    
    expect(respSpend.statusCode).toEqual(200);
    expect(respSpend.body.txId.length).toEqual(64);
    expect(respSpend.body.hex.length).toBe(604);


  });
});
