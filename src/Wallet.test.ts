import { WalletTypeEnum } from "./wallet/enum";
import { UnitEnum } from "./enum";
import { bchParam } from "./chain";
import { Wallet, RegTestWallet, TestNetWallet } from "./wallet/Wif";
import { createWallet } from "./wallet/createWallet";
import { BalanceResponse } from "./util/balanceObjectFromSatoshi";
import { ExchangeRate } from "./rate/ExchangeRate";
import { initProviders, disconnectProviders } from "./network/Connection";

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe(`Test Wallet library`, () => {
  test("Should get a random regtest wallet", async () => {
    let alice = await RegTestWallet.newRandom("alice_random");
    expect(alice.cashaddr!.slice(0, 8)).toBe("bchreg:q");
    expect(alice.getDepositAddress()!.slice(0, 8)).toBe("bchreg:q");
    const aliceBalance = (await alice.getBalance()) as BalanceResponse;
    expect(aliceBalance.bch).toBe(0);
    expect(aliceBalance.usd).toBe(0);
    expect(await alice.getBalance("sat")).toBe(0);
  });

  test("Should get the regtest wallet balance", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF); // insert WIF from #1
      // Build Bob's wallet from a public address, check his balance.
      const aliceBalance = (await alice.getBalance()) as BalanceResponse;
      expect(aliceBalance.bch).toBeGreaterThan(5000);
      expect(await alice.getBalance("sat")).toBeGreaterThan(
        5000 * bchParam.subUnits
      );
    }
  });

  test("Should get a regtest wallet fromId", async () => {
    let alice = await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF}`
    );
    expect(alice.cashaddr!.slice(0, 8)).toBe("bchreg:q");
    expect(alice.getDepositAddress()!.slice(0, 8)).toBe("bchreg:q");
  });

  test("Should get a testnet wallet fromId", async () => {
    let alice = await TestNetWallet.fromId(
      `wif:testnet:${process.env.PRIVATE_WIF}`
    );
    expect(alice.cashaddr!.slice(0, 9)).toBe("bchtest:q");
  });

  test("Should get a wallet fromId", async () => {
    let alice = await Wallet.newRandom();
    let alice2 = await Wallet.fromId(`wif:mainnet:${alice.privateKeyWif}`);
    expect(alice2.cashaddr).toBe(alice.cashaddr);
    expect(alice.getDepositAddress()!.slice(0, 13)).toBe("bitcoincash:q");
  });

  test("Should also throw error on wif/network mismatch", async () => {
    expect.assertions(1);
    try {
      await TestNetWallet.fromId(
        `wif:testnet:KysvoRyDkxQycBGj49K8oC3minAfoXnVmkcgx6UsZx3g2VvyGCAa`
      );
    } catch (e) {
      expect(e.message).toBe(
        "Testnet type wif KysvoRyDkxQycBGj49K8oC3minAfoXnVmkcgx6UsZx3g2VvyGCAa passed, should start with c"
      );
    }
  });

  test("Should get an error passing wrong walletType", async () => {
    expect.assertions(1);
    try {
      await RegTestWallet.fromId(`hd:regtest:${process.env.PRIVATE_WIF}`);
    } catch (e) {
      expect(e.message.slice(0, 97)).toBe(
        "Wallet type hd was passed to single address wallet"
      );
    }
  });

  test("Should get an error passing wrong network to fromId", async () => {
    expect.assertions(1);
    try {
      await TestNetWallet.fromId(`wif:regtest:${process.env.PRIVATE_WIF}`);
    } catch (e) {
      expect(e.message.slice(0, 97)).toBe(
        "Network prefix regtest to a testnet wallet"
      );
    }
  });

  // TODO fix this error message
  // test("Should throw a nice error when attempting to send fractional satoshi", async () => {
  //   expect.assertions(1);
  //   try {
  //     let alice = await RegTestWallet.fromId(
  //       `wif:regtest:${process.env.PRIVATE_WIF}`
  //     );
  //     const bob = await createWallet({
  //       type: WalletTypeEnum.Wif,
  //       network: "regtest",
  //     });
  //     await alice.send([
  //       {
  //         cashaddr: bob.cashaddr!,
  //         value: 1100.33333,
  //         unit: "satoshis",
  //       },
  //     ]);
  //   } catch (e) {
  //     expect(e.message).toBe(
  //       "Cannot send 1100.33333 satoshis, (fractional sats do not exist, yet), please use an integer number."
  //     );
  //   }
  // });

  test("Should get the regtest wallet balance", async () => {
    // Build Alice's wallet from Wallet Import Format string, check sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = await RegTestWallet.fromId(
        `wif:regtest:${process.env.PRIVATE_WIF}`
      ); // insert WIF from #1
      expect(await alice.getBalance("sat")).toBeGreaterThan(
        5000 * bchParam.subUnits
      );
    }
  });

  test("Should send a transaction on the regression network", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF); // insert WIF from #1
      const bob = await createWallet({
        type: WalletTypeEnum.Wif,
        network: "regtest",
      });
      let sendResponse = await alice.send([
        {
          cashaddr: bob.cashaddr!,
          value: 1100,
          unit: "satoshis",
        },
      ]);
      expect(sendResponse!.txId!.length).toBe(64);
      expect(sendResponse.balance!.bch).toBeGreaterThan(0.01);
      // Build Bob's wallet from a public address, check his balance.
      const bobBalance = (await bob.getBalance()) as BalanceResponse;
      expect(bobBalance.sat).toBe(1100);
    }
  });

  test("Should send a transaction from specific utxos", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
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
          value: 1001,
          unit: "satoshis",
        },
        {
          cashaddr: bob.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
        // Using a larger amount here to test that it would indeed return as change to the sender when specified later.
        {
          cashaddr: bob.cashaddr!,
          value: 10001,
          unit: "satoshis",
        },
        // Using a second larger amount to assure that if too many utxos are specified, money the utxo isn't used
        {
          cashaddr: bob.cashaddr!,
          value: 10001,
          unit: "satoshis",
        },
      ]);
      let bobBalance = (await bob.getBalance()) as BalanceResponse;
      expect(bobBalance.sat).toBe(22003);
      let bobUtxos = await bob.getUtxos();
      expect(bobUtxos.utxos!.length).toBe(4);

      // Filter the list to only odd value utxos
      let oddUtxoIds = bobUtxos
        .utxos!.filter((utxo) => utxo.value % 2 == 1)
        .map((utxo) => {
          return utxo.utxoId;
        });

      // Build Bob's wallet from a public address, check his balance.
      let sendResponse2 = await bob.send(
        [
          {
            cashaddr: charlie.cashaddr!,
            value: 1675,
            unit: "satoshis",
          },
        ],
        { utxoIds: oddUtxoIds }
      );
      expect(sendResponse2.balance!.sat).toBe(19967);
      expect(await charlie.getBalance("sat")).toBe(1675);
    }
  });

  test("Should send maximum amount from specific utxos", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
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
          value: 1001,
          unit: "satoshis",
        },
        {
          cashaddr: bob.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
        {
          cashaddr: bob.cashaddr!,
          value: 1001,
          unit: "satoshis",
        },
      ]);
      let bobBalance = (await bob.getBalance()) as BalanceResponse;
      expect(bobBalance.sat).toBe(3002);
      let bobUtxos = await bob.getUtxos();
      expect(bobUtxos.utxos!.length).toBe(3);

      // Filter the list to only odd value utxos
      let oddUtxoIds = bobUtxos
        .utxos!.filter((utxo) => utxo.value % 2 == 1)
        .map((utxo) => {
          return utxo.utxoId;
        });

      // Build Bob's wallet from a public address, check his balance.
      let sendResponse2 = await bob.sendMax(charlie.cashaddr!, {
        utxoIds: oddUtxoIds,
      });
      expect(sendResponse2.balance!.sat).toBe(1000);
      expect(await charlie.getBalance("sat")).toBeGreaterThan(1500);
    }
  });

  test("Send a transaction in dollars regression network", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF); // insert WIF from #1
      const bob = await createWallet({
        type: WalletTypeEnum.Wif,
        network: "regtest",
      });
      let usdRate = await ExchangeRate.get("usd");
      await alice.send([[bob.cashaddr!, usdRate, "Usd"]]);
      // Build Bob's wallet from a public address, check his balance.
      const bobBalance = (await bob.getBalance()) as BalanceResponse;

      expect(Math.round(bobBalance.usd!)).toBe(Math.round(usdRate));
    }
  });

  // If the change from a transaction is less than the DUST_UTXO_THRESHOLD
  // assume that the change cannot be spent and use it as fee instead
  test("Send assume change less than dust is fee", async () => {
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

      await alice.send([[bob.cashaddr!, 1440, "sat"]]);
      await bob.send([[charlie.cashaddr!, 734, "sat"]]);
      // Build Bob's wallet from a public address, check his balance.
      const bobBalance = (await bob.getBalance()) as BalanceResponse;
      // Build Bob's wallet from a public address, check his balance.
      const charlieBalance = (await charlie.getBalance()) as BalanceResponse;
      expect(Math.round(bobBalance.sat!)).toBe(0);
      expect(Math.round(charlieBalance.sat!)).toBe(734);
    }
  });

  test("Send a transaction (as array) on the regression network", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF); // insert WIF from #1
      const bob = await createWallet({
        network: "regtest",
      });
      await alice.send([[bob.cashaddr!, 1200, UnitEnum.SAT]]);
      // Build Bob's wallet from a public address, check his balance.
      const bobBalance = (await bob.getBalance()) as BalanceResponse;
      expect(bobBalance.sat).toBe(1200);
    }
  });

  test("Should get a random testnet wallet", async () => {
    let alice = await TestNetWallet.newRandom();
    const aliceBalance = (await alice.getBalance()) as BalanceResponse;
    expect(alice.cashaddr!.slice(0, 9)).toBe("bchtest:q");
    expect(aliceBalance.bch).toBe(0);
    expect(aliceBalance.usd).toBe(0);
    expect(await alice.getBalance("sat")).toBe(0);
  });

  test("Send a transaction on regtest, send it back", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats

    const alice = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);
    const bob = await createWallet({
      type: WalletTypeEnum.Seed,
      network: "regtest",
      name: "Bob's random wallet",
    });

    if (!alice.cashaddr || !bob.cashaddr) {
      throw Error("Alice or Bob's wallet are missing addresses");
    }
    if (!alice.privateKey || !bob.privateKey) {
      throw Error("Alice or Bob's wallet are missing private keys");
    }

    // Assume fulcrum node polling is 1s
    await alice.send([
      {
        cashaddr: bob.cashaddr,
        value: 3400,
        unit: UnitEnum.SAT,
      },
    ]);

    // Build Bob's wallet from a public address, check his balance.
    const sendMaxResponse = await bob.sendMax(alice.cashaddr);
    expect(sendMaxResponse.txId!.length).toBe(64);

    // Assume fulcrum node polling is 1s
    const bobBalanceFinal = (await bob.getBalance()) as BalanceResponse;
    expect(bobBalanceFinal.sat).toBe(0);
  });

  // This use case has been moved off to use a specially configured fulcrum service
  //
  // test("Should get a large number of utxos", async () => {
  //   let reid = await Wallet.watchOnly(
  //     "bitcoincash:qr6cwfje4mv2q7srq5rav0up8ahc68hrtsy6ee7tk2"
  //   );
  //   //reid.provider = getClientProvider()
  //   const reidBalance = (await reid.getBalance()) as BalanceResponse;
  //   const reidUtxos = await reid.getUtxos();
  //   expect(reidUtxos.utxos!.length).toBeDefined();

  //   expect(reid.getDepositAddress()!).toBe(
  //     "bitcoincash:qr6cwfje4mv2q7srq5rav0up8ahc68hrtsy6ee7tk2"
  //   );
  //   expect(reidBalance.bch).toBeGreaterThan(0);
  //   expect(reidBalance.usd).toBeGreaterThan(0);
  //   expect(typeof (await reid.getBalance("sat"))).toBe("number");
  // });
});
