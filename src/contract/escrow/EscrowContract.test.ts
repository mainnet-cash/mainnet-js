import { EscrowContract } from "./EscrowContract";
import { RegTestWallet } from "../../wallet/Wif";

describe(`Test Escrow Contracts`, () => {
  test("Should serialize and deserialize", async () => {
    let arbiter = await RegTestWallet.newRandom();
    let buyer = await RegTestWallet.newRandom();
    let seller = await RegTestWallet.newRandom();

    let escrow = new EscrowContract({
      arbiterAddr: arbiter.getDepositAddress()!,
      buyerAddr: buyer.getDepositAddress()!,
      sellerAddr: seller.getDepositAddress()!,
    });
    let escrow2 = new EscrowContract({
      arbiterAddr: arbiter.getDepositAddress()!,
      buyerAddr: buyer.getDepositAddress()!,
      sellerAddr: seller.getDepositAddress()!,
    });
    expect(escrow.toString()).toBe(escrow2.toString());
    expect(escrow.getAddress()).toBe(escrow2.getAddress());

    let escrow3 = EscrowContract.fromId(escrow.toString());
    expect(escrow.getAddress()).toBe(escrow3.getAddress());
  });

  test("Should allow buyer to spend to seller", async () => {
    let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF);

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
    });
    expect(escrow.getAddress()!.slice(0, 8)).toBe("bchreg:p");
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
    await escrow.run(buyer.privateKeyWif!, "spend");
    expect(await escrow.getBalance()).toBe(0);
    expect(await seller.getBalance("sat")).toBeGreaterThan(448000);

    // spend the sellers funds to another wallet
    await seller.sendMax(seller2.getDepositAddress()!);
    expect(await seller2.getBalance("sat")).toBeGreaterThan(446000);
  });

  test("Should allow arbiter to spend to seller", async () => {
    let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF);

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
    await escrow.run(arbiter.privateKeyWif!, "spend");
    expect(await escrow.getBalance()).toBe(0);
    expect(await seller.getBalance("sat")).toBeGreaterThan(448000);

    // spend the sellers funds to another wallet
    await seller.sendMax(seller2.getDepositAddress()!);
    expect(await seller2.getBalance("sat")).toBeGreaterThan(446000);
  });

  test("Should allow seller to refund to buyer", async () => {
    let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF);

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
    await escrow.run(seller.privateKeyWif!, "refund");
    expect(await escrow.getBalance()).toBe(0);
    expect(await buyer.getBalance("sat")).toBeGreaterThan(448000);

    // spend the sellers funds to another wallet
    await buyer.sendMax(buyer2.getDepositAddress()!);
    expect(await buyer2.getBalance("sat")).toBeGreaterThan(446000);
  });

  test("Should allow arbiter to refund to buyer", async () => {
    let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF);

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
    await escrow.run(arbiter.privateKeyWif!, "refund");
    expect(await escrow.getBalance()).toBe(0);
    expect(await buyer.getBalance("sat")).toBeGreaterThan(448000);

    // spend the sellers funds to another wallet
    await buyer.sendMax(buyer2.getDepositAddress()!);
    expect(await buyer2.getBalance("sat")).toBeGreaterThan(446000);
  });

  test("Should fail on refund by buyer", async () => {
    expect.assertions(1);
    try {
      let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF);

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
      await escrow.run(buyer.privateKeyWif!, "refund");
    } catch (e) {
      expect(e.message.split("\n")[0]).toBe(
        "Error: Transaction failed with reason: the transaction was rejected by network rules."
      );
    }
  });

  test("Should throw error on spend by seller", async () => {
    expect.assertions(1);
    try {
      let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF);

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
      await escrow.run(seller.privateKeyWif!, "spend");
    } catch (e) {
      expect(e.message.split("\n")[0]).toBe(
        "Error: Transaction failed with reason: the transaction was rejected by network rules."
      );
    }
  });
});
