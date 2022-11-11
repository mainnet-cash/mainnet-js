import { RegTestWallet } from "../wallet/Wif";
import { WalletTypeEnum } from "../wallet/enum";
import { createWallet } from "../wallet/createWallet";
import { getAddressHistory } from "./electrumTransformer";
import { mine } from "../mine";

// This class transforms outputs from electrum to a standard array of history.
test("Should get an address history", async () => {
  // Build Alice's wallet from Wallet Import Format string
  if (!process.env.PRIVATE_WIF) {
    throw Error("Attempted to pass an empty WIF");
  } else {
    let alice = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF); // insert WIF from #1
    const bob = await createWallet({
      type: WalletTypeEnum.Wif,
      network: "regtest",
    });
    const charlie = await createWallet({
      type: WalletTypeEnum.Wif,
      network: "regtest",
    });
    let sendResponse = await alice.send([
      {
        cashaddr: bob.cashaddr!,
        value: 31000,
        unit: "satoshis",
      },
      {
        cashaddr: charlie.cashaddr!,
        value: 41000,
        unit: "satoshis",
      },
    ]);
    await mine({ cashaddr: alice.getDepositAddress(), blocks: 10 });
    await bob.send([
      {
        cashaddr: charlie.cashaddr!,
        value: 2100,
        unit: "satoshis",
      },
    ]);
    await mine({ cashaddr: alice.getDepositAddress(), blocks: 1 });
    await bob.send([
      {
        cashaddr: alice.cashaddr!,
        value: 2100,
        unit: "satoshis",
      },
    ]);
    expect(sendResponse!.txId!.length).toBe(64);
    expect(sendResponse.balance!.bch).toBeGreaterThan(0.01);
    await mine({ cashaddr: alice.getDepositAddress(), blocks: 10 });

    // Build Bob's wallet from a public address, check his balance.
    const bobHistory = await getAddressHistory(
      bob.getDepositAddress(),
      bob.provider
    );
    expect(bobHistory.transactions[0].value).toBe(-2100);
    expect(bobHistory.transactions[0].to).toBe(alice.getDepositAddress());
    expect(bobHistory.transactions[0].from).toBe(bob.getDepositAddress());
    expect(bobHistory.transactions[1].value).toBe(-2100);
    expect(bobHistory.transactions[1].from).toBe(bob.getDepositAddress());
    expect(bobHistory.transactions[1].to).toBe(charlie.getDepositAddress());
    expect(bobHistory.transactions[2].value).toBe(31000);
    expect(bobHistory.transactions[2].balance).toBe(31000);
    expect(bobHistory.transactions[2].fee).toBe(0);
    expect(bobHistory.transactions[2].from).toBe(alice.getDepositAddress());
  }
});

// This class transforms outputs from electrum to a standard array of history.
test("Should get a history with multi-party sends", async () => {
  // Build Alice's wallet from Wallet Import Format string
  if (!process.env.PRIVATE_WIF) {
    throw Error("Attempted to pass an empty WIF");
  } else {
    let alice = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF); // insert WIF from #1
    const bob = await createWallet({
      type: WalletTypeEnum.Wif,
      network: "regtest",
    });
    const charlie = await createWallet({
      type: WalletTypeEnum.Wif,
      network: "regtest",
    });
    let sendResponse = await alice.send([
      {
        cashaddr: bob.cashaddr!,
        value: 31000,
        unit: "satoshis",
      },
    ]);
    await mine({ cashaddr: alice.getDepositAddress(), blocks: 10 });
    await bob.send([
      {
        cashaddr: charlie.cashaddr!,
        value: 2100,
        unit: "satoshis",
      },
      {
        cashaddr: alice.cashaddr!,
        value: 2100,
        unit: "satoshis",
      },
    ]);
    await mine({ cashaddr: alice.getDepositAddress(), blocks: 1 });
    expect(sendResponse!.txId!.length).toBe(64);
    expect(sendResponse.balance!.bch).toBeGreaterThan(0.01);
    await mine({ cashaddr: alice.getDepositAddress(), blocks: 1 });

    // Build Bob's wallet from a public address, check his balance.
    const bobHistory = await getAddressHistory(
      bob.getDepositAddress(),
      bob.provider
    );
    expect(bobHistory.transactions[1].txn).toBe(bobHistory.transactions[0].txn);
    expect(bobHistory.transactions[1].fee).toBe(bobHistory.transactions[0].fee);
    expect(bobHistory.transactions[1].fee).toBeGreaterThan(120);
    expect(bobHistory.transactions[1].fee).toBeLessThan(150);
    expect(bobHistory.transactions[0].value).toBe(-2100);
    expect(bobHistory.transactions[0].to).toBe(alice.getDepositAddress());
    expect(bobHistory.transactions[0].from).toBe(bob.getDepositAddress());
    expect(bobHistory.transactions[1].value).toBe(-2100);
    expect(bobHistory.transactions[1].to).toBe(charlie.getDepositAddress());
    expect(bobHistory.transactions[1].from).toBe(bob.getDepositAddress());

    expect(bobHistory.transactions[2].value).toBe(31000);
    expect(bobHistory.transactions[2].fee).toBe(0);
    expect(bobHistory.transactions[2].from).toBe(alice.getDepositAddress());
  }
});

// This class transforms outputs from electrum to a standard array of history.
test("Should cut results with a longer history to given count", async () => {
  // Build Alice's wallet from Wallet Import Format string
  if (!process.env.PRIVATE_WIF) {
    throw Error("Attempted to pass an empty WIF");
  } else {
    let alice = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF); // insert WIF from #1
    const bob = await createWallet({
      type: WalletTypeEnum.Wif,
      network: "regtest",
    });
    const charlie = await createWallet({
      type: WalletTypeEnum.Wif,
      network: "regtest",
    });
    let sendResponse = await alice.send([
      {
        cashaddr: bob.cashaddr!,
        value: 31000,
        unit: "satoshis",
      },
    ]);
    await mine({ cashaddr: alice.getDepositAddress(), blocks: 10 });
    await bob.send([
      {
        cashaddr: charlie.cashaddr!,
        value: 2100,
        unit: "satoshis",
      },
      {
        cashaddr: alice.cashaddr!,
        value: 2100,
        unit: "satoshis",
      },
      {
        cashaddr: alice.cashaddr!,
        value: 2100,
        unit: "satoshis",
      },
    ]);
    await mine({ cashaddr: alice.getDepositAddress(), blocks: 1 });
    expect(sendResponse!.txId!.length).toBe(64);
    expect(sendResponse.balance!.bch).toBeGreaterThan(0.01);
    await mine({ cashaddr: alice.getDepositAddress(), blocks: 10 });

    // Build Bob's wallet from a public address, check his balance.
    const bobHistory = await getAddressHistory(
      bob.getDepositAddress(),
      bob.provider,
      "sat",
      0,
      2
    );
    expect(bobHistory.transactions.length).toBe(4);

    expect(bobHistory.transactions[0].value).toBe(-2100);
    expect(bobHistory.transactions[0].to).toBe(alice.getDepositAddress());
    expect(bobHistory.transactions[1].value).toBe(-2100);
    expect(bobHistory.transactions[1].to).toBe(alice.getDepositAddress());
  }
});

// This class transforms outputs from electrum to a standard array of history.
test("Should handel input and fee from many utxos", async () => {
  // Build Alice's wallet from Wallet Import Format string
  if (!process.env.PRIVATE_WIF) {
    throw Error("Attempted to pass an empty WIF");
  } else {
    let alice = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF); // insert WIF from #1
    const bob = await createWallet({
      type: WalletTypeEnum.Wif,
      network: "regtest",
    });
    const charlie = await createWallet({
      type: WalletTypeEnum.Wif,
      network: "regtest",
    });
    let sendResponse = await alice.send([
      {
        cashaddr: bob.cashaddr!,
        value: 600,
        unit: "satoshis",
      },
      {
        cashaddr: bob.cashaddr!,
        value: 600,
        unit: "satoshis",
      },
      {
        cashaddr: bob.cashaddr!,
        value: 600,
        unit: "satoshis",
      },
      {
        cashaddr: bob.cashaddr!,
        value: 600,
        unit: "satoshis",
      },
    ]);
    await mine({ cashaddr: alice.getDepositAddress(), blocks: 10 });
    await bob.sendMax(charlie.cashaddr!);
    await mine({ cashaddr: alice.getDepositAddress(), blocks: 1 });
    expect(sendResponse!.txId!.length).toBe(64);
    expect(sendResponse.balance!.bch).toBeGreaterThan(0.01);
    await mine({ cashaddr: alice.getDepositAddress(), blocks: 10 });

    // Build Bob's wallet from a public address, check his balance.
    const bobHistory = await getAddressHistory(
      bob.getDepositAddress(),
      bob.provider,
      "sat"
    );

    expect(bobHistory.transactions[0].value).toBeLessThan(-1700);
    expect(bobHistory.transactions[0].to).toBe(charlie.getDepositAddress());
    expect(bobHistory.transactions[1].from).toBe(alice.getDepositAddress());
  }
});
