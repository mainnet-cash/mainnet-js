import { EscrowContract } from "./EscrowContract";
import { RegTestWallet } from "../../wallet/Wif";

import { initProviders, disconnectProviders } from "../../network/Connection";

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe(`Test Escrow Contracts`, () => {
  test("Should serialize and deserialize", async () => {
    let escrowContractId =
    "escrowContract:testnet:WW1Ob2RHVnpkRHB4ZWpBd2NHczViR1p6TUdzNVpqVjJaak5xT0dnMk5uRm1iWEZoWjJzNGJtTTFObVZzY1RSa2RqST06WW1Ob2RHVnpkRHB4Y201c2RYVm5aVFUyWVdoNGMzazJjSEJzY1RRemNuWmhOMnMyY3psa2EyNTFOSEExTWpjNFlXZz06WW1Ob2RHVnpkRHB4ZW5Od1kzbDNlRzF0TkdaeGFHWTVhMnB5YTI1eVl6Tm5jbk4yTW5aMWEyVnhlV3B4YkdFd2JuUT06TVRBd01EQT0=:TVRVNExESTBNQ3d5TVRZc01Ua3hMRGMyTERNeExEazRMREUyTml3eE5EQXNOellzTVRBd0xERXlNeXd5TXpVc05qUXNOemdzTVRrekxESXhNaXc0T0N3eU5ETXNNVGszOk1qTXhMREkxTkN3eE1UTXNNalVzTVRZMkxERTROeXd4TVRVc05qUXNNVFUwTERnc01USTJMREV3TERFNU5pd3hNRGdzTWpNNUxERTNNeXd4Tmpnc01qRXNNVGd5TERFMU9RPT06TVRZd0xESTRMREUzTERFNU9Dd3lNaklzTWpNMExERTBOQ3c1TXl3ek55d3hPREFzTVRNMUxERXdOU3d4TkRNc01UY3NOalFzTWpJMExERTVOeXcxTVN3eE5UQXNNakF3Ok1UQXdNREE9Ok1USTJNVEl6TVRVMk5nPT0=:cHJhZ21hIGNhc2hzY3JpcHQgXjAuNi4xOwogICAgICAgICAgICBjb250cmFjdCBlc2Nyb3coYnl0ZXMyMCBzZWxsZXJQa2gsIGJ5dGVzMjAgYnV5ZXJQa2gsIGJ5dGVzMjAgYXJiaXRlclBraCwgaW50IGNvbnRyYWN0QW1vdW50LCBpbnQgY29udHJhY3ROb25jZSkgewoKICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNwZW5kKHB1YmtleSBzaWduaW5nUGssIHNpZyBzLCBpbnQgYW1vdW50LCBpbnQgbm9uY2UpIHsKICAgICAgICAgICAgICAgICAgICByZXF1aXJlKGhhc2gxNjAoc2lnbmluZ1BrKSA9PSBhcmJpdGVyUGtoIHx8IGhhc2gxNjAoc2lnbmluZ1BrKSA9PSBidXllclBraCk7CiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZShjaGVja1NpZyhzLCBzaWduaW5nUGspKTsKICAgICAgICAgICAgICAgICAgICByZXF1aXJlKGFtb3VudCA+PSBjb250cmFjdEFtb3VudCk7CiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZShub25jZSA9PSBjb250cmFjdE5vbmNlKTsKICAgICAgICAgICAgICAgICAgICBieXRlczM0IG91dHB1dCA9IG5ldyBPdXRwdXRQMlBLSChieXRlczgoYW1vdW50KSwgc2VsbGVyUGtoKTsKICAgICAgICAgICAgICAgICAgICByZXF1aXJlKGhhc2gyNTYob3V0cHV0KSA9PSB0eC5oYXNoT3V0cHV0cyk7CiAgICAgICAgICAgICAgICB9CgogICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVmdW5kKHB1YmtleSBzaWduaW5nUGssIHNpZyBzLCBpbnQgYW1vdW50LCBpbnQgbm9uY2UpIHsKICAgICAgICAgICAgICAgICAgICByZXF1aXJlKGhhc2gxNjAoc2lnbmluZ1BrKSA9PSBhcmJpdGVyUGtofHxoYXNoMTYwKHNpZ25pbmdQaykgPT0gc2VsbGVyUGtoKTsKICAgICAgICAgICAgICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICAgICAgICAgICAgICAgIHJlcXVpcmUoYW1vdW50ID49IGNvbnRyYWN0QW1vdW50KTsKICAgICAgICAgICAgICAgICAgICByZXF1aXJlKG5vbmNlID09IGNvbnRyYWN0Tm9uY2UpOwogICAgICAgICAgICAgICAgICAgIGJ5dGVzMzQgb3V0cHV0ID0gbmV3IE91dHB1dFAyUEtIKGJ5dGVzOChhbW91bnQpLCBidXllclBraCk7CiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZShoYXNoMjU2KG91dHB1dCkgPT0gdHguaGFzaE91dHB1dHMpOwogICAgICAgICAgICAgICAgfQogICAgICAgICAgICB9CiAgICAgICAg:1261231566";
    let e = EscrowContract.fromId(escrowContractId);
    expect(e.toString()).toBe(escrowContractId);
  });

  test("Should serialize and deserialize", async () => {
    let escrow = new EscrowContract({
      sellerAddr: "bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj",
      buyerAddr: "bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6",
      arbiterAddr: "bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev",
      amount: 19500,
    });
    let escrow2 = new EscrowContract({
      sellerAddr: "bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj",
      buyerAddr: "bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6",
      arbiterAddr: "bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev",
      amount: 19500,
    });
    expect(escrow.toString().slice(0, 20)).toBe(
      escrow2.toString().slice(0, 20)
    );
    let escrow3 = EscrowContract.fromId(escrow.toString());
    expect(escrow.getDepositAddress()).toBe(escrow3.getDepositAddress());
  });

  test("Should allow buyer to spend to seller", async () => {
    let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

    let arbiter = await RegTestWallet.newRandom();
    let buyer = await RegTestWallet.newRandom();
    let seller = await RegTestWallet.newRandom();
    let seller2 = await RegTestWallet.newRandom();
    let escrow = new EscrowContract({
      sellerAddr: seller.getDepositAddress()!,
      arbiterAddr: arbiter.getDepositAddress()!,
      buyerAddr: buyer.getDepositAddress()!,
      amount: 9500,
    });
    expect(escrow.getDepositAddress()!.slice(0, 8)).toBe("bchreg:p");
    // fund the escrow contract
    await funder.send([
      {
        cashaddr: escrow.getDepositAddress()!,
        value: 6400,
        unit: "satoshis",
      },
    ]);
    await funder.send([
      {
        cashaddr: escrow.getDepositAddress()!,
        value: 6400,
        unit: "satoshis",
      },
    ]);
    await funder.send([
      {
        cashaddr: escrow.getDepositAddress()!,
        value: 6400,
        unit: "satoshis",
      },
    ]);

    expect(await escrow.getBalance()).toBeGreaterThan(12000);

    // spend the escrow contract
    await escrow.call(buyer.privateKeyWif!, "spend");
    expect(await escrow.getBalance()).toBe(0);
    expect(await seller.getBalance("sat")).toBeGreaterThan(9500);

    // spend the sellers funds to another wallet
    await seller.sendMax(seller2.getDepositAddress()!);
    expect(await seller2.getBalance("sat")).toBeGreaterThan(9200);
  });

  test("Should allow buyer to spend specific utxos to seller", async () => {
    let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

    let arbiter = await RegTestWallet.newRandom();
    let buyer = await RegTestWallet.newRandom();
    let seller = await RegTestWallet.newRandom();
    let seller2 = await RegTestWallet.newRandom();
    let escrow = new EscrowContract({
      sellerAddr: seller.getDepositAddress()!,
      arbiterAddr: arbiter.getDepositAddress()!,
      buyerAddr: buyer.getDepositAddress()!,
      amount: 9500,
    });
    expect(escrow.getDepositAddress()!.slice(0, 8)).toBe("bchreg:p");
    // fund the escrow contract
    await funder.send([
      {
        cashaddr: escrow.getDepositAddress()!,
        value: 9400,
        unit: "satoshis",
      },
    ]);
    await funder.send([
      {
        cashaddr: escrow.getDepositAddress()!,
        value: 9400,
        unit: "satoshis",
      },
    ]);
    await funder.send([
      {
        cashaddr: escrow.getDepositAddress()!,
        value: 9400,
        unit: "satoshis",
      },
    ]);

    expect(await escrow.getBalance()).toBeGreaterThan(18000);
    let utxos = (await escrow.getUtxos()).utxos.slice(0, 2).map((u) => {
      return u.utxoId;
    });

    // spend the escrow contract
    await escrow.call(buyer.privateKeyWif!, "spend", undefined, false, utxos);
    expect(await escrow.getBalance()).toBe(9400);
    expect(await seller.getBalance("sat")).toBeGreaterThan(9500);

    // spend the sellers funds to another wallet
    await seller.sendMax(seller2.getDepositAddress()!);
    expect(await seller2.getBalance("sat")).toBeGreaterThan(9500);
  });

  test("Should allow arbiter to spend to seller", async () => {
    let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

    let arbiter = await RegTestWallet.newRandom();
    let buyer = await RegTestWallet.newRandom();
    let seller = await RegTestWallet.newRandom();
    let seller2 = await RegTestWallet.newRandom();

    await funder.send([
      {
        cashaddr: buyer.getDepositAddress()!,
        value: 500000,
        unit: "satoshis",
      },
    ]);
    expect(await buyer.getBalance("sat")).toBe(500000);
    let escrow = new EscrowContract({
      arbiterAddr: arbiter.getDepositAddress()!,
      buyerAddr: buyer.getDepositAddress()!,
      sellerAddr: seller.getDepositAddress()!,
      amount: 445000,
    });

    // fund the escrow contract
    await buyer.send([
      {
        cashaddr: escrow.getDepositAddress()!,
        value: 450000,
        unit: "satoshis",
      },
    ]);
    expect(await escrow.getBalance()).toBe(450000);

    // spend the escrow contract
    await escrow.call(arbiter.privateKeyWif!, "spend");
    expect(await escrow.getBalance()).toBe(0);
    expect(await seller.getBalance("sat")).toBeGreaterThan(445000);

    // spend the sellers funds to another wallet
    await seller.sendMax(seller2.getDepositAddress()!);
    expect(await seller2.getBalance("sat")).toBeGreaterThan(445000);
  });

  test("Should allow seller to refund to buyer", async () => {
    let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

    let arbiter = await RegTestWallet.newRandom();
    let buyer = await RegTestWallet.newRandom();
    let buyer2 = await RegTestWallet.newRandom();
    let seller = await RegTestWallet.newRandom();

    await funder.send([
      {
        cashaddr: buyer.getDepositAddress()!,
        value: 500000,
        unit: "satoshis",
      },
    ]);
    expect(await buyer.getBalance("sat")).toBe(500000);
    let escrow = new EscrowContract({
      arbiterAddr: arbiter.getDepositAddress()!,
      buyerAddr: buyer.getDepositAddress()!,
      sellerAddr: seller.getDepositAddress()!,
      amount: 446000,
    });

    // fund the escrow contract
    await buyer.send([
      {
        cashaddr: escrow.getDepositAddress()!,
        value: 450000,
        unit: "satoshis",
      },
    ]);
    expect(await escrow.getBalance()).toBe(450000);

    // refund the escrow contract
    await escrow.call(seller.privateKeyWif!, "refund");
    expect(await escrow.getBalance()).toBe(0);
    expect(await buyer.getBalance("sat")).toBeGreaterThan(448000);

    // spend the sellers funds to another wallet
    await buyer.sendMax(buyer2.getDepositAddress()!);
    expect(await buyer2.getBalance("sat")).toBeGreaterThan(446000);
  });

  test("Should allow arbiter to refund to buyer", async () => {
    let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

    let arbiter = await RegTestWallet.newRandom();
    let buyer = await RegTestWallet.newRandom();
    let buyer2 = await RegTestWallet.newRandom();
    let seller = await RegTestWallet.newRandom();

    await funder.send([
      {
        cashaddr: buyer.getDepositAddress()!,
        value: 500000,
        unit: "satoshis",
      },
    ]);
    expect(await buyer.getBalance("sat")).toBe(500000);
    let escrow = new EscrowContract({
      arbiterAddr: arbiter.getDepositAddress()!,
      buyerAddr: buyer.getDepositAddress()!,
      sellerAddr: seller.getDepositAddress()!,
      amount: 446000,
    });

    // fund the escrow contract
    await buyer.send([
      {
        cashaddr: escrow.getDepositAddress()!,
        value: 450000,
        unit: "satoshis",
      },
    ]);
    expect(await escrow.getBalance()).toBe(450000);

    // refund the escrow contract
    await escrow.call(arbiter.privateKeyWif!, "refund");
    expect(await escrow.getBalance()).toBe(0);
    expect(await buyer.getBalance("sat")).toBeGreaterThan(448000);

    // spend the sellers funds to another wallet
    await buyer.sendMax(buyer2.getDepositAddress()!);
    expect(await buyer2.getBalance("sat")).toBeGreaterThan(446000);
  });

  test("Should return hex when getHexOnly is true", async () => {
    let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

    let arbiter = await RegTestWallet.newRandom();
    let buyer = await RegTestWallet.newRandom();
    let seller = await RegTestWallet.newRandom();

    await funder.send([
      {
        cashaddr: buyer.getDepositAddress()!,
        value: 500000,
        unit: "satoshis",
      },
    ]);
    expect(await buyer.getBalance("sat")).toBe(500000);
    let escrow = new EscrowContract({
      arbiterAddr: arbiter.getDepositAddress()!,
      buyerAddr: buyer.getDepositAddress()!,
      sellerAddr: seller.getDepositAddress()!,
      amount: 446000,
    });

    // fund the escrow contract
    await buyer.send([
      {
        cashaddr: escrow.getDepositAddress()!,
        value: 450000,
        unit: "satoshis",
      },
    ]);
    expect(await escrow.getBalance()).toBe(450000);

    // refund the escrow contract
    let hexOnly = await escrow.call(
      arbiter.privateKeyWif!,
      "refund",
      undefined,
      true
    );
    // Assure the hex is long enough.
    expect(hexOnly.hex).toMatch(/020000000[0-9a-f]{1600}[0-9a-f]+/);
    // Assure the contract funds are still there
    expect(await escrow.getBalance()).toBe(450000);
  });

  test("Should fail on refund by buyer", async () => {
    expect.assertions(1);
    try {
      let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

      let arbiter = await RegTestWallet.newRandom();
      let buyer = await RegTestWallet.newRandom();
      let seller = await RegTestWallet.newRandom();

      await funder.send([
        {
          cashaddr: buyer.getDepositAddress()!,
          value: 500000,
          unit: "satoshis",
        },
      ]);
      let escrow = new EscrowContract({
        arbiterAddr: arbiter.getDepositAddress()!,
        buyerAddr: buyer.getDepositAddress()!,
        sellerAddr: seller.getDepositAddress()!,
        amount: 40000,
      });

      // fund the escrow contract
      await buyer.send([
        {
          cashaddr: escrow.getDepositAddress()!,
          value: 450000,
          unit: "satoshis",
        },
      ]);

      // refund the escrow contract
      await escrow.call(buyer.privateKeyWif!, "refund");
    } catch (e) {
      expect(e.message.split("\n")[0]).toBe(
        "Error: Transaction failed with reason: the transaction was rejected by network rules."
      );
    }
  });

  test("Should throw error on spend by seller", async () => {
    expect.assertions(1);
    try {
      let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

      let arbiter = await RegTestWallet.newRandom();
      let buyer = await RegTestWallet.newRandom();
      let seller = await RegTestWallet.newRandom();

      await funder.send([
        {
          cashaddr: buyer.getDepositAddress()!,
          value: 500000,
          unit: "satoshis",
        },
      ]);
      let escrow = new EscrowContract({
        arbiterAddr: arbiter.getDepositAddress()!,
        buyerAddr: buyer.getDepositAddress()!,
        sellerAddr: seller.getDepositAddress()!,
        amount: 40000,
      });

      // fund the escrow contract
      await buyer.send([
        {
          cashaddr: escrow.getDepositAddress()!,
          value: 450000,
          unit: "satoshis",
        },
      ]);
      // refund the escrow contract
      await escrow.call(seller.privateKeyWif!, "spend");
    } catch (e) {
      expect(e.message.split("\n")[0]).toBe(
        "Error: Transaction failed with reason: the transaction was rejected by network rules."
      );
    }
  });

  test("Should create an escrow contract", async () => {
    let contractResp = EscrowContract.escrowContractFromJsonRequest({
      type: "escrow",
      sellerAddr: "bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj",
      buyerAddr: "bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6",
      arbiterAddr: "bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev",
      amount: 5000,
    });

    expect(contractResp.escrowContractId.length).toBeGreaterThan(30);
    expect(contractResp.escrowContractId).toBe(
      EscrowContract.fromId(contractResp.escrowContractId).toString()
    );
  });

  test("Should create return a contract object", async () => {
    let response = EscrowContract.escrowContractFromJsonRequest({
      type: "escrow",
      sellerAddr: "bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj",
      buyerAddr: "bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6",
      arbiterAddr: "bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev",
      amount: 5000,
    });

    expect(response.escrowContractId).toBe(
      EscrowContract.fromId(response.escrowContractId).toString()
    );
  });

  test("Should create a contract from serialized id", async () => {
    let createResponse = EscrowContract.escrowContractFromJsonRequest({
      type: "escrow",
      sellerAddr: "bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e",
      buyerAddr: "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0",
      arbiterAddr: "bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8",
      amount: 12000,
    });

    let response = EscrowContract.fromId(createResponse.escrowContractId);
    expect(response.getDepositAddress()).toBe(createResponse.cashaddr);
    expect(response.toString().slice(0, 201)).toBe(
      createResponse.escrowContractId.slice(0, 201)
    );
  });
});
