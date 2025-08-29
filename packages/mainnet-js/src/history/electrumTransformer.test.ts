import { RegTestWallet, Wallet } from "../wallet/Wif";
import { WalletTypeEnum } from "../wallet/enum";
import { createWallet } from "../wallet/createWallet";
import { mine } from "../mine";
import { getAddressHistory } from "./electrumTransformer";

test("Should get miner history", async () => {
  const alice = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);
  const history = await getAddressHistory({
    address: alice.getDepositAddress(),
    provider: alice.provider!,
  });
  expect(history.length).toBeGreaterThan(0);
});

// // This class transforms outputs from electrum to a standard array of history.
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
    const bobHistory = await getAddressHistory({
      address: bob.getDepositAddress(),
      provider: bob.provider!,
    });
    expect(bobHistory[0].valueChange).toBe(-2320);
    expect(
      bobHistory[0].outputs.some(
        (output) => output.address === alice.getDepositAddress()
      )
    ).toBe(true);
    expect(
      bobHistory[0].inputs.some(
        (input) => input.address === bob.getDepositAddress()
      )
    ).toBe(true);
    expect(bobHistory[1].valueChange).toBe(-2320);
    expect(
      bobHistory[1].inputs.some(
        (input) => input.address === bob.getDepositAddress()
      )
    ).toBe(true);
    expect(
      bobHistory[1].outputs.some(
        (output) => output.address === charlie.getDepositAddress()
      )
    ).toBe(true);
    expect(bobHistory[2].valueChange).toBe(31000);
    expect(bobHistory[2].balance).toBe(31000);
    expect(bobHistory[2].fee).not.toBe(0);
    expect(
      bobHistory[2].inputs.some(
        (input) => input.address === alice.getDepositAddress()
      )
    ).toBe(true);
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
    await mine({ cashaddr: alice.getDepositAddress(), blocks: 1 });

    // Build Bob's wallet from a public address, check his balance.
    const bobHistory = await getAddressHistory({
      address: bob.getDepositAddress(),
      provider: bob.provider!,
    });

    expect(bobHistory[1].fee).toBeGreaterThan(120);
    expect(bobHistory[1].fee).toBe(220);
    expect(bobHistory[0].valueChange).toBe(-2320);
    expect(
      bobHistory[0].outputs.some(
        (output) => output.address === alice.getDepositAddress()
      )
    ).toBe(true);
    expect(
      bobHistory[0].inputs.some(
        (input) => input.address === bob.getDepositAddress()
      )
    ).toBe(true);
    expect(bobHistory[1].valueChange).toBe(-2320);
    expect(
      bobHistory[1].outputs.some(
        (output) => output.address === charlie.getDepositAddress()
      )
    ).toBe(true);
    expect(
      bobHistory[1].inputs.some(
        (input) => input.address === bob.getDepositAddress()
      )
    ).toBe(true);

    expect(bobHistory[2].valueChange).toBe(31000);
    expect(bobHistory[2].fee).not.toBe(0);
    expect(
      bobHistory[2].inputs.some(
        (input) => input.address === alice.getDepositAddress()
      )
    ).toBe(true);
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
    const bobHistory = await getAddressHistory({
      address: bob.getDepositAddress(),
      provider: bob.provider!,
      unit: "sat",
      start: 0,
      count: 2,
    });
    expect(bobHistory.length).toBe(2);

    expect(bobHistory[0].valueChange).toBe(-6588);
    expect(
      bobHistory[0].outputs.some(
        (output) => output.address === alice.getDepositAddress()
      )
    ).toBe(true);
    expect(bobHistory[1].valueChange).toBe(31000);
    expect(
      bobHistory[1].outputs.some(
        (output) => output.address === alice.getDepositAddress()
      )
    ).toBe(true);
  }
});

// This class transforms outputs from electrum to a standard array of history.
test("Should handle input and fee from many utxos", async () => {
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
    const bobHistory = await getAddressHistory({
      address: bob.getDepositAddress(),
      provider: bob.provider!,
      unit: "sat",
    });

    expect(bobHistory[0].valueChange).toBeLessThan(-1700);
    expect(
      bobHistory[0].outputs.some(
        (output) => output.address === charlie.getDepositAddress()
      )
    ).toBe(true);
    expect(
      bobHistory[1].inputs.some(
        (input) => input.address === alice.getDepositAddress()
      )
    ).toBe(true);
  }
});
