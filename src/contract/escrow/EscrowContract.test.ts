import { EscrowContract } from "./EscrowContract";
import { RegTestWallet } from "../../wallet/Wif";
import { Contract } from "cashscript";

describe(`Test Escrow Contracts`, () => {
  test("Should allow buyer to spend to seller", async () => {
    let funder = (await RegTestWallet.fromWIF(
      process.env.PRIVATE_WIF
    )) as RegTestWallet;

    let arbiter = (await RegTestWallet.newRandom()) as RegTestWallet;
    let buyer = (await RegTestWallet.newRandom()) as RegTestWallet;
    let seller = (await RegTestWallet.newRandom()) as RegTestWallet;
    let seller2 = (await RegTestWallet.newRandom()) as RegTestWallet;

    await funder.send([
      {
        cashaddr: buyer.getDepositAddress()!,
        value: 500000,
        unit: "satoshis",
      },
    ]);
    expect(await buyer.getBalance("sat")).toBe(500000);
    let escrow = new EscrowContract({
      arbiterCashaddr: arbiter.getDepositAddress()!,
      buyerCashaddr: buyer.getDepositAddress()!,
      sellerCashaddr: seller.getDepositAddress()!,
    });

    // fund the escrow contract
    await buyer.send([
      {
        cashaddr: escrow.getAddress()!,
        value: 450000,
        unit: "satoshis",
      },
    ]);
    expect(await escrow.getBalance()).toBe(450000);

    // spend the escrow contract
    await escrow.run(buyer.privateKeyWif!, "spendByBuyer");
    expect(await escrow.getBalance()).toBe(0);
    expect(await seller.getBalance("sat")).toBeGreaterThan(448000);

    // spend the sellers funds to another wallet
    await seller.sendMax(seller2.getDepositAddress()!);
    expect(await seller2.getBalance("sat")).toBeGreaterThan(446000);
  });

  test("Should allow arbiter to spend to seller", async () => {
    let funder = (await RegTestWallet.fromWIF(
      process.env.PRIVATE_WIF
    )) as RegTestWallet;

    let arbiter = (await RegTestWallet.newRandom()) as RegTestWallet;
    let buyer = (await RegTestWallet.newRandom()) as RegTestWallet;
    let seller = (await RegTestWallet.newRandom()) as RegTestWallet;
    let seller2 = (await RegTestWallet.newRandom()) as RegTestWallet;

    await funder.send([
      {
        cashaddr: buyer.getDepositAddress()!,
        value: 500000,
        unit: "satoshis",
      },
    ]);
    expect(await buyer.getBalance("sat")).toBe(500000);
    let escrow = new EscrowContract({
      arbiterCashaddr: arbiter.getDepositAddress()!,
      buyerCashaddr: buyer.getDepositAddress()!,
      sellerCashaddr: seller.getDepositAddress()!,
    });

    // fund the escrow contract
    await buyer.send([
      {
        cashaddr: escrow.getAddress()!,
        value: 450000,
        unit: "satoshis",
      },
    ]);
    expect(await escrow.getBalance()).toBe(450000);

    // spend the escrow contract
    await escrow.run(arbiter.privateKeyWif!, "spendByArbiter");
    expect(await escrow.getBalance()).toBe(0);
    expect(await seller.getBalance("sat")).toBeGreaterThan(448000);

    // spend the sellers funds to another wallet
    await seller.sendMax(seller2.getDepositAddress()!);
    expect(await seller2.getBalance("sat")).toBeGreaterThan(446000);
  });

  test("Should allow seller to refund to buyer", async () => {
    let funder = (await RegTestWallet.fromWIF(
      process.env.PRIVATE_WIF
    )) as RegTestWallet;

    let arbiter = (await RegTestWallet.newRandom()) as RegTestWallet;
    let buyer = (await RegTestWallet.newRandom()) as RegTestWallet;
    let buyer2 = (await RegTestWallet.newRandom()) as RegTestWallet;
    let seller = (await RegTestWallet.newRandom()) as RegTestWallet;

    await funder.send([
      {
        cashaddr: buyer.getDepositAddress()!,
        value: 500000,
        unit: "satoshis",
      },
    ]);
    expect(await buyer.getBalance("sat")).toBe(500000);
    let escrow = new EscrowContract({
      arbiterCashaddr: arbiter.getDepositAddress()!,
      buyerCashaddr: buyer.getDepositAddress()!,
      sellerCashaddr: seller.getDepositAddress()!,
    });

    // fund the escrow contract
    await buyer.send([
      {
        cashaddr: escrow.getAddress()!,
        value: 450000,
        unit: "satoshis",
      },
    ]);
    expect(await escrow.getBalance()).toBe(450000);

    // refund the escrow contract
    await escrow.run(seller.privateKeyWif!, "refundBySeller");
    expect(await escrow.getBalance()).toBe(0);
    expect(await buyer.getBalance("sat")).toBeGreaterThan(448000);

    // spend the sellers funds to another wallet
    await buyer.sendMax(buyer2.getDepositAddress()!);
    expect(await buyer2.getBalance("sat")).toBeGreaterThan(446000);
  });

  test("Should allow arbiter to refund to buyer", async () => {
    let funder = (await RegTestWallet.fromWIF(
      process.env.PRIVATE_WIF
    )) as RegTestWallet;

    let arbiter = (await RegTestWallet.newRandom()) as RegTestWallet;
    let buyer = (await RegTestWallet.newRandom()) as RegTestWallet;
    let buyer2 = (await RegTestWallet.newRandom()) as RegTestWallet;
    let seller = (await RegTestWallet.newRandom()) as RegTestWallet;

    await funder.send([
      {
        cashaddr: buyer.getDepositAddress()!,
        value: 500000,
        unit: "satoshis",
      },
    ]);
    expect(await buyer.getBalance("sat")).toBe(500000);
    let escrow = new EscrowContract({
      arbiterCashaddr: arbiter.getDepositAddress()!,
      buyerCashaddr: buyer.getDepositAddress()!,
      sellerCashaddr: seller.getDepositAddress()!,
    });

    // fund the escrow contract
    await buyer.send([
      {
        cashaddr: escrow.getAddress()!,
        value: 450000,
        unit: "satoshis",
      },
    ]);
    expect(await escrow.getBalance()).toBe(450000);

    // refund the escrow contract
    await escrow.run(arbiter.privateKeyWif!, "refundByArbiter");
    expect(await escrow.getBalance()).toBe(0);
    expect(await buyer.getBalance("sat")).toBeGreaterThan(448000);

    // spend the sellers funds to another wallet
    await buyer.sendMax(buyer2.getDepositAddress()!);
    expect(await buyer2.getBalance("sat")).toBeGreaterThan(446000);
  });

  test("Should fail on refund by buyer", async () => {
    expect.assertions(1);
    try {
      let funder = (await RegTestWallet.fromWIF(
        process.env.PRIVATE_WIF
      )) as RegTestWallet;

      let arbiter = (await RegTestWallet.newRandom()) as RegTestWallet;
      let buyer = (await RegTestWallet.newRandom()) as RegTestWallet;
      let seller = (await RegTestWallet.newRandom()) as RegTestWallet;

      await funder.send([
        {
          cashaddr: buyer.getDepositAddress()!,
          value: 500000,
          unit: "satoshis",
        },
      ]);
      let escrow = new EscrowContract({
        arbiterCashaddr: arbiter.getDepositAddress()!,
        buyerCashaddr: buyer.getDepositAddress()!,
        sellerCashaddr: seller.getDepositAddress()!,
      });

      // fund the escrow contract
      await buyer.send([
        {
          cashaddr: escrow.getAddress()!,
          value: 450000,
          unit: "satoshis",
        },
      ]);

      // refund the escrow contract
      await escrow.run(buyer.privateKeyWif!, "refundByArbiter");
    } catch (e) {
      expect(e.message.split("\n")[0]).toBe(
        "Error: Transaction failed with reason: the transaction was rejected by network rules."
      );
    }
  });

  test("Should throw error on spend by seller", async () => {
    expect.assertions(1);
    try {
      let funder = (await RegTestWallet.fromWIF(
        process.env.PRIVATE_WIF
      )) as RegTestWallet;

      let arbiter = (await RegTestWallet.newRandom()) as RegTestWallet;
      let buyer = (await RegTestWallet.newRandom()) as RegTestWallet;
      let seller = (await RegTestWallet.newRandom()) as RegTestWallet;

      await funder.send([
        {
          cashaddr: buyer.getDepositAddress()!,
          value: 500000,
          unit: "satoshis",
        },
      ]);
      let escrow = new EscrowContract({
        arbiterCashaddr: arbiter.getDepositAddress()!,
        buyerCashaddr: buyer.getDepositAddress()!,
        sellerCashaddr: seller.getDepositAddress()!,
      });

      // fund the escrow contract
      await buyer.send([
        {
          cashaddr: escrow.getAddress()!,
          value: 450000,
          unit: "satoshis",
        },
      ]);

      // refund the escrow contract
      await escrow.run(seller.privateKeyWif!, "spendByArbiter");
    } catch (e) {
      expect(e.message.split("\n")[0]).toBe(
        "Error: Transaction failed with reason: the transaction was rejected by network rules."
      );
    }
  });

  test("Should throw error on spend by seller", async () => {
    expect.assertions(1);
    try {
      let funder = (await RegTestWallet.fromWIF(
        process.env.PRIVATE_WIF
      )) as RegTestWallet;

      let arbiter = (await RegTestWallet.newRandom()) as RegTestWallet;
      let buyer = (await RegTestWallet.newRandom()) as RegTestWallet;
      let seller = (await RegTestWallet.newRandom()) as RegTestWallet;

      await funder.send([
        {
          cashaddr: buyer.getDepositAddress()!,
          value: 500000,
          unit: "satoshis",
        },
      ]);
      let escrow = new EscrowContract({
        arbiterCashaddr: arbiter.getDepositAddress()!,
        buyerCashaddr: buyer.getDepositAddress()!,
        sellerCashaddr: seller.getDepositAddress()!,
      });

      // fund the escrow contract
      await buyer.send([
        {
          cashaddr: escrow.getAddress()!,
          value: 450000,
          unit: "satoshis",
        },
      ]);

      // refund the escrow contract
      await escrow.run(seller.privateKeyWif!, "spendByArbiter");
    } catch (e) {
      expect(e.message.split("\n")[0]).toBe(
        "Error: Transaction failed with reason: the transaction was rejected by network rules."
      );
    }
  });
});
