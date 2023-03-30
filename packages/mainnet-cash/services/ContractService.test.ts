import server from "../"
import { RegTestWallet } from "mainnet-js";
import request from "supertest";


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
    expect(contractResp.body.contractId).toMatch(/contract:regtest:\w+/);
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
    expect(utxoResp.body[0].satoshis).toEqual(21000);

    let respSpend = await request(app).post("/contract/call").send({
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
    expect(respSpend.body.txid.length).toEqual(64);
    expect(respSpend.body.hex.length).toBe(604);
  });



/**
   * Test other cashscript actions
   */
  it("Should allow allow building or getting debug", async () => {
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
    expect(contractResp.body.contractId).toMatch(/contract:regtest:\w+/);
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

    let hexOnly = await request(app).post("/contract/call").send({
      contractId: contractId,
      action: "build",
      function: "timeout",
      arguments: [sender.getPublicKeyCompressed(true), sender.toString()],
      to: {
        to: sender.getDepositAddress(),
        amount: 1000,
      },
    }
    );

    // test building with array of CashScript style requests
    let hexOnlyAlt = await request(app).post("/contract/call").send({
      contractId: contractId,
      action: "build",
      function: "timeout",
      arguments: [sender.getPublicKeyCompressed(true), sender.toString()],
      to: [{
        to: sender.getDepositAddress(),
        amount: 1000,
      },
      {
        to: sender.getDepositAddress(),
        amount: 2000,
      }],
    }
    );
    let hexOnlyAlt2 = await request(app).post("/contract/call").send({
      contractId: contractId,
      action: "build",
      function: "timeout",
      arguments: [sender.getPublicKeyCompressed(true), sender.toString()],
      to: {
        unit: 'sat',
        cashaddr: sender.getDepositAddress(),
        value: 1000,
      },
    }
    );
    let hexOnlyAlt3 = await request(app).post("/contract/call").send({
      contractId: contractId,
      action: "build",
      function: "timeout",
      arguments: [sender.getPublicKeyCompressed(true), sender.toString()],
      to: [{
        unit: 'sat',
        cashaddr: sender.getDepositAddress(),
        value: 1000,
      },
      {
        unit: 'sat',
        cashaddr: sender.getDepositAddress(),
        value: 2000,
      }],
    }
    );
    expect(hexOnly.statusCode).toEqual(200);
    expect(hexOnlyAlt.statusCode).toEqual(200);
    expect(hexOnlyAlt2.statusCode).toEqual(200);
    expect(hexOnlyAlt3.statusCode).toEqual(200);
    expect(hexOnly.body.hex).toMatch(/[0-f]{604}/);

    let debug = await request(app).post("/contract/call").send({
      contractId: contractId,
      action: "meep",
      function: "timeout",
      arguments: [sender.getPublicKeyCompressed(true), sender.toString()],
      to: {
        to: sender.getDepositAddress(),
        amount: 17000,
      },
    }
    );

    expect(debug.statusCode).toEqual(200);
    expect(debug.body.debug).toMatch(/meep debug --tx*/);
  });

/**
   * Test other cashscript actions
   */
 it("Should return info for a contract", async () => {
    let sender =  await RegTestWallet.fromId(`wif:regtest:${process.env.PRIVATE_WIF}`)
    let receiver = await RegTestWallet.watchOnly("bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8")

    // This contract has a bug, senderPkh and receiptPkh are swapped
    let script = `contract FailingContractWithSwappedSigners(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
      function transfer(pubkey signingPk, sig s) {
        require(checkSig(s, signingPk));
        require(hash160(signingPk) == senderPkh);
      }

      function timeout(pubkey signingPk, sig s) {
        require(checkSig(s, signingPk));
        require(hash160(signingPk) == recipientPkh);
        require(tx.time >= timeout);
      }
    }`;

    const contractResp = await request(app).post("/contract/create").send({
      script: script,
      parameters: [sender.getPublicKeyHash(true), receiver.getPublicKeyHash(true), "215"],
      network: 'regtest'
    });

    expect(contractResp.statusCode).toEqual(200);
    expect(contractResp.body.contractId).toMatch(/contract:regtest:\w+/);
    expect(contractResp.body.cashaddr).toMatch(/bchreg:[p|q]/);

    const contractInfoResp = await request(app).post("/contract/info").send({
      contractId: contractResp.body.contractId
    });
    expect(contractInfoResp.statusCode).toEqual(200);
    expect(contractInfoResp.body.contractId).toBe(contractResp.body.contractId);
    expect(contractInfoResp.body.cashaddr).toMatch(/bchreg:[p|q]/);
    expect(contractInfoResp.body.script).toBe(script);
    expect(contractInfoResp.body.parameters).toStrictEqual([sender.getPublicKeyHash(true), receiver.getPublicKeyHash(true), 215]);
  });

  /**
   * Test other cashscript actions
   */
  it("Should return a decent error when contract is rejected", async () => {
    let sender =  await RegTestWallet.fromId(`wif:regtest:${process.env.PRIVATE_WIF}`)
    let receiver = await RegTestWallet.watchOnly("bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8")

    // This contract has a bug, senderPkh and receiptPkh are swapped
    let script = `contract FailingContractWithSwappedSigners(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
      function transfer(pubkey signingPk, sig s) {
        require(checkSig(s, signingPk));
        require(hash160(signingPk) == senderPkh);
      }

      function timeout(pubkey signingPk, sig s) {
        require(checkSig(s, signingPk));
        require(hash160(signingPk) == recipientPkh);
        require(tx.time >= timeout);
      }
    }`;

    const contractResp = await request(app).post("/contract/create").send({
      script: script,
      parameters: [sender.getPublicKeyHash(true), receiver.getPublicKeyHash(true), "215"],
      network: 'regtest'
    });

    expect(contractResp.statusCode).toEqual(200);
    expect(contractResp.body.contractId).toMatch(/contract:regtest:\w+/);
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

    let failure = await request(app).post("/contract/call").send({
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

    expect(failure.statusCode).toEqual(500);
    expect(failure.body.message).toMatch(/Transaction failed with reason: the transaction was rejected by network rules*/);
  });

});