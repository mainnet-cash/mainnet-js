import { EscrowContract } from "./EscrowContract";

import {
  initProviders,
  disconnectProviders,
  RegTestWallet,
  toUtxoId,
} from "mainnet-js";
import { TransactionDetails } from "cashscript/dist/interfaces";

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe(`Test Escrow Contracts`, () => {
  test("Should serialize and deserialize", async () => {
    const escrowContractId =
      "escrowContract:testnet:WW1Ob2RHVnpkRHB4ZWpBd2NHczViR1p6TUdzNVpqVjJaak5xT0dnMk5uRm1iWEZoWjJzNGJtTTFObVZzY1RSa2RqST06WW1Ob2RHVnpkRHB4Y201c2RYVm5aVFUyWVdoNGMzazJjSEJzY1RRemNuWmhOMnMyY3psa2EyNTFOSEExTWpjNFlXZz06WW1Ob2RHVnpkRHB4ZW5Od1kzbDNlRzF0TkdaeGFHWTVhMnB5YTI1eVl6Tm5jbk4yTW5aMWEyVnhlV3B4YkdFd2JuUT06TVRBd01EQT0=:TVRVNExESTBNQ3d5TVRZc01Ua3hMRGMyTERNeExEazRMREUyTml3eE5EQXNOellzTVRBd0xERXlNeXd5TXpVc05qUXNOemdzTVRrekxESXhNaXc0T0N3eU5ETXNNVGszOk1qTXhMREkxTkN3eE1UTXNNalVzTVRZMkxERTROeXd4TVRVc05qUXNNVFUwTERnc01USTJMREV3TERFNU5pd3hNRGdzTWpNNUxERTNNeXd4Tmpnc01qRXNNVGd5TERFMU9RPT06TVRZd0xESTRMREUzTERFNU9Dd3lNaklzTWpNMExERTBOQ3c1TXl3ek55d3hPREFzTVRNMUxERXdOU3d4TkRNc01UY3NOalFzTWpJMExERTVOeXcxTVN3eE5UQXNNakF3Ok1UQXdNREE9Ok1USTJNVEl6TVRVMk5nPT0=:CiAgICAgICAgICAgIGNvbnRyYWN0IGVzY3JvdyhieXRlczIwIHNlbGxlclBraCwgYnl0ZXMyMCBidXllclBraCwgYnl0ZXMyMCBhcmJpdGVyUGtoLCBpbnQgY29udHJhY3RBbW91bnQsIGludCBjb250cmFjdE5vbmNlKSB7CgogICAgICAgICAgICAgICAgZnVuY3Rpb24gc3BlbmQocHVia2V5IHNpZ25pbmdQaywgc2lnIHMsIGludCBhbW91bnQsIGludCBub25jZSkgewogICAgICAgICAgICAgICAgICAgIHJlcXVpcmUoaGFzaDE2MChzaWduaW5nUGspID09IGFyYml0ZXJQa2ggfHwgaGFzaDE2MChzaWduaW5nUGspID09IGJ1eWVyUGtoKTsKICAgICAgICAgICAgICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICAgICAgICAgICAgICAgIHJlcXVpcmUoYW1vdW50ID49IGNvbnRyYWN0QW1vdW50KTsKICAgICAgICAgICAgICAgICAgICByZXF1aXJlKG5vbmNlID09IGNvbnRyYWN0Tm9uY2UpOwogICAgICAgICAgICAgICAgICAgIGJ5dGVzMjUgbG9ja2luZ0NvZGUgPSBuZXcgTG9ja2luZ0J5dGVjb2RlUDJQS0goc2VsbGVyUGtoKTsKICAgICAgICAgICAgICAgICAgICBib29sIHNlbmRzVG9TZWxsZXIgPSB0eC5vdXRwdXRzWzBdLmxvY2tpbmdCeXRlY29kZSA9PSBsb2NraW5nQ29kZTsKICAgICAgICAgICAgICAgICAgICByZXF1aXJlKHR4Lm91dHB1dHNbMF0udmFsdWUgPT0gYW1vdW50KTsKICAgICAgICAgICAgICAgICAgICByZXF1aXJlKHNlbmRzVG9TZWxsZXIpOwogICAgICAgICAgICAgICAgfQoKICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlZnVuZChwdWJrZXkgc2lnbmluZ1BrLCBzaWcgcywgaW50IGFtb3VudCwgaW50IG5vbmNlKSB7CiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZShoYXNoMTYwKHNpZ25pbmdQaykgPT0gYXJiaXRlclBraHx8aGFzaDE2MChzaWduaW5nUGspID09IHNlbGxlclBraCk7CiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZShjaGVja1NpZyhzLCBzaWduaW5nUGspKTsKICAgICAgICAgICAgICAgICAgICByZXF1aXJlKGFtb3VudCA+PSBjb250cmFjdEFtb3VudCk7CiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZShub25jZSA9PSBjb250cmFjdE5vbmNlKTsKICAgICAgICAgICAgICAgICAgICBieXRlczI1IGxvY2tpbmdDb2RlID0gbmV3IExvY2tpbmdCeXRlY29kZVAyUEtIKGJ1eWVyUGtoKTsKICAgICAgICAgICAgICAgICAgICBib29sIHNlbmRzVG9TZWxsZXIgPSB0eC5vdXRwdXRzWzBdLmxvY2tpbmdCeXRlY29kZSA9PSBsb2NraW5nQ29kZTsKICAgICAgICAgICAgICAgICAgICByZXF1aXJlKHR4Lm91dHB1dHNbMF0udmFsdWUgPT0gYW1vdW50KTsKICAgICAgICAgICAgICAgICAgICByZXF1aXJlKHNlbmRzVG9TZWxsZXIpOwogICAgICAgICAgICAgICAgfQogICAgICAgICAgICB9CiAgICAgICAg:1261231566";
    const e = EscrowContract.fromId(escrowContractId);
    expect(e.toString()).toBe(escrowContractId);
  });

  test("Should serialize and deserialize", async () => {
    const escrow = new EscrowContract({
      sellerAddr: "bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj",
      buyerAddr: "bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6",
      arbiterAddr: "bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev",
      amount: 19500,
    });
    const escrow2 = new EscrowContract({
      sellerAddr: "bchtest:qrmxnsr0g6kl7s3zkweedf5cvlqscatajgt62kpjtj",
      buyerAddr: "bchtest:qz74q2z3v6qakjwj9htgn62d6vn0uvag2u2qgz6fm6",
      arbiterAddr: "bchtest:qrzqzlnclmmrt4vujzz6nu9je99rv85kw5aa9hklev",
      amount: 19500,
    });
    expect(escrow.toString().slice(0, 20)).toBe(
      escrow2.toString().slice(0, 20)
    );
    const escrow3 = EscrowContract.fromId(escrow.toString());
    expect(escrow.getDepositAddress()).toBe(escrow3.getDepositAddress());
  });

  test("Should allow buyer to spend to seller", async () => {
    const funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

    const arbiter = await RegTestWallet.newRandom();
    const buyer = await RegTestWallet.newRandom();
    const seller = await RegTestWallet.newRandom();
    const seller2 = await RegTestWallet.newRandom();
    const escrow = new EscrowContract({
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
    const funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

    const arbiter = await RegTestWallet.newRandom();
    const buyer = await RegTestWallet.newRandom();
    const seller = await RegTestWallet.newRandom();
    const seller2 = await RegTestWallet.newRandom();
    const escrow = new EscrowContract({
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
    const utxoIds: string[] = (await escrow.getUtxos())
      .slice(0, 2)
      .map(toUtxoId);

    // spend the escrow contract
    await escrow.call(buyer.privateKeyWif!, "spend", undefined, false, utxoIds);
    expect(await escrow.getBalance()).toBe(9400);
    expect(await seller.getBalance("sat")).toBeGreaterThan(9500);

    // spend the sellers funds to another wallet
    await seller.sendMax(seller2.getDepositAddress()!);
    expect(await seller2.getBalance("sat")).toBeGreaterThan(9500);
  });

  test("Should allow arbiter to spend to seller", async () => {
    const funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

    const arbiter = await RegTestWallet.newRandom();
    const buyer = await RegTestWallet.newRandom();
    const seller = await RegTestWallet.newRandom();
    const seller2 = await RegTestWallet.newRandom();

    await funder.send([
      {
        cashaddr: buyer.getDepositAddress()!,
        value: 500000,
        unit: "satoshis",
      },
    ]);
    expect(await buyer.getBalance("sat")).toBe(500000);
    const escrow = new EscrowContract({
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
    const funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

    const arbiter = await RegTestWallet.newRandom();
    const buyer = await RegTestWallet.newRandom();
    const buyer2 = await RegTestWallet.newRandom();
    const seller = await RegTestWallet.newRandom();

    await funder.send([
      {
        cashaddr: buyer.getDepositAddress()!,
        value: 500000,
        unit: "satoshis",
      },
    ]);
    expect(await buyer.getBalance("sat")).toBe(500000);
    const escrow = new EscrowContract({
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
    const funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

    const arbiter = await RegTestWallet.newRandom();
    const buyer = await RegTestWallet.newRandom();
    const buyer2 = await RegTestWallet.newRandom();
    const seller = await RegTestWallet.newRandom();

    await funder.send([
      {
        cashaddr: buyer.getDepositAddress()!,
        value: 500000,
        unit: "satoshis",
      },
    ]);
    expect(await buyer.getBalance("sat")).toBe(500000);
    const escrow = new EscrowContract({
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
    const funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

    const arbiter = await RegTestWallet.newRandom();
    const buyer = await RegTestWallet.newRandom();
    const seller = await RegTestWallet.newRandom();

    await funder.send([
      {
        cashaddr: buyer.getDepositAddress()!,
        value: 500000,
        unit: "satoshis",
      },
    ]);
    expect(await buyer.getBalance("sat")).toBe(500000);
    const escrow = new EscrowContract({
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
    const hexOnly = await escrow.call(
      arbiter.privateKeyWif!,
      "refund",
      undefined,
      true
    );
    // Assure the hex is long enough.
    expect((hexOnly as TransactionDetails).hex).toMatch(/020000000[0-9a-f]+/);
    // Assure the contract funds are still there
    expect(await escrow.getBalance()).toBe(450000);
  });

  test("Should fail on refund by buyer", async () => {
    expect.assertions(1);
    try {
      const funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

      const arbiter = await RegTestWallet.newRandom();
      const buyer = await RegTestWallet.newRandom();
      const seller = await RegTestWallet.newRandom();

      await funder.send([
        {
          cashaddr: buyer.getDepositAddress()!,
          value: 500000,
          unit: "satoshis",
        },
      ]);
      const escrow = new EscrowContract({
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
    } catch (e: any) {
      expect(e.message.split("\n")[0]).toBe(
        "Error: escrow.cash:16 Require statement failed at input 0 in contract escrow.cash at line 16."
      );
    }
  });

  test("Should throw error on insuffecent funds", async () => {
    expect.assertions(1);
    try {
      const funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

      const arbiter = await RegTestWallet.newRandom();
      const buyer = await RegTestWallet.newRandom();
      const seller = await RegTestWallet.newRandom();

      await funder.send([
        {
          cashaddr: buyer.getDepositAddress()!,
          value: 42000,
          unit: "satoshis",
        },
      ]);
      const escrow = new EscrowContract({
        arbiterAddr: arbiter.getDepositAddress()!,
        buyerAddr: buyer.getDepositAddress()!,
        sellerAddr: seller.getDepositAddress()!,
        amount: 40000,
      });

      // fund the escrow contract
      await buyer.send([
        {
          cashaddr: escrow.getDepositAddress()!,
          value: 40000,
          unit: "satoshis",
        },
      ]);

      // refund the escrow contract
      await escrow.call(buyer.privateKeyWif!, "spend");
    } catch (e: any) {
      expect(e.message.split("\n")[0]).toBe(
        "Error: The contract amount (40000) could not be submitted for a tx fee (399) with the available with contract balance (40000)"
      );
    }
  });

  test("Should throw error on spend by seller", async () => {
    expect.assertions(1);
    try {
      const funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);

      const arbiter = await RegTestWallet.newRandom();
      const buyer = await RegTestWallet.newRandom();
      const seller = await RegTestWallet.newRandom();

      await funder.send([
        {
          cashaddr: buyer.getDepositAddress()!,
          value: 500000,
          unit: "satoshis",
        },
      ]);
      const escrow = new EscrowContract({
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
    } catch (e: any) {
      expect(e.message.split("\n")[0]).toBe(
        "Error: escrow.cash:5 Require statement failed at input 0 in contract escrow.cash at line 5."
      );
    }
  });

  test("Should create an escrow contract", async () => {
    const contractResp = EscrowContract.escrowContractFromJsonRequest({
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
    const response = EscrowContract.escrowContractFromJsonRequest({
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
    const createResponse = EscrowContract.escrowContractFromJsonRequest({
      type: "escrow",
      sellerAddr: "bchreg:qrc3vd0guh7mn9c9vl58rx6wcv92ld57aquqrre62e",
      buyerAddr: "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0",
      arbiterAddr: "bchreg:qznjmr5de89zv850lta6jeg5a6ftps4lyu58j8qcp8",
      amount: 12000,
    });

    const response = EscrowContract.fromId(createResponse.escrowContractId);
    expect(response.getDepositAddress()).toBe(createResponse.cashaddr);
    expect(response.toString().slice(0, 201)).toBe(
      createResponse.escrowContractId.slice(0, 201)
    );
  });
});
