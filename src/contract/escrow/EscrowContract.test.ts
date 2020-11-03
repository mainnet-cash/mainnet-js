import { EscrowContract } from "./EscrowContract";
import { RegTestWallet } from "../../wallet/Wif";
import { Contract } from "cashscript";

describe(`Test Escrow Contracts`, () => {
  test("Should create a contract", async () => {
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
    // await funder.send([{
    //     cashaddr: arbiter.getDepositAddress()!,
    //     value: 5000,
    //     unit: "satoshis",
    // }])

    // expect(await arbiter.getBalance('sat')).toBe(5000);
    expect(await buyer.getBalance("sat")).toBe(500000);
    let escrow = new EscrowContract({
      arbiterCashaddr: arbiter.getDepositAddress()!,
      buyerCashaddr: buyer.getDepositAddress()!,
      sellerCashaddr: seller.getDepositAddress()!,
    });

    await buyer.send([
      {
        cashaddr: escrow.getAddress()!,
        value: 450000,
        unit: "satoshis",
      },
    ]);

    let contractUtxos = await escrow.getUtxos();

    expect(contractUtxos.length).toBeGreaterThan(0);
    expect(await escrow.getBalance()).toBe(450000);

    let buyerSpendResponse = await escrow.run(
      buyer.privateKeyWif!,
      "spendByBuyer",
      false,
      contractUtxos
    );
    //let arbiterSpendResponse = await escrow.run(arbiter.privateKeyWif!, "spendByArbiter", false, contractUtxos)

    console.log(JSON.stringify(buyerSpendResponse));
    //console.log(JSON.stringify(arbiterSpendResponse))
    console.log(await seller.getBalance("sat"));
    expect(await escrow.getBalance()).toBe(0);
    expect(await seller.getBalance("sat")).toBeGreaterThan(20);
  });
});
