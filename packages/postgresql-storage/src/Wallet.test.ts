import {
  BaseWallet,
  initProviders,
  disconnectProviders,
  RegTestWallet,
  TestNetWallet,
  Wallet,
  createWallet,
  WalletTypeEnum,
  toBch,
  toUtxoId,
  ExchangeRate,
  convert,
  Config,
} from "mainnet-js";
import { default as SqlProvider } from "./SqlProvider.js";

BaseWallet.StorageProvider = SqlProvider;

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
    const aliceBalance = await alice.getBalance();
    expect(aliceBalance).toBe(0n);
  });

  test("Should get the regtest wallet balance", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF); // insert WIF from #1
      // Build Bob's wallet from a public address, check his balance.
      const aliceBalance = await alice.getBalance();
      expect(toBch(aliceBalance)).toBeGreaterThan(5000);
      expect(aliceBalance).toBeGreaterThan(5000n * 100000000n);
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
    } catch (e: any) {
      expect(e.message).toBe(
        "Testnet type wif KysvoRyDkxQycBGj49K8oC3minAfoXnVmkcgx6UsZx3g2VvyGCAa passed, should start with c"
      );
    }
  });

  test("Should get an error passing wrong walletType", async () => {
    expect.assertions(1);
    try {
      await RegTestWallet.fromId(`hd:regtest:${process.env.PRIVATE_WIF}`);
    } catch (e: any) {
      expect(e.message.slice(0, 97)).toBe("Unknown wallet type 'hd'");
    }
  });

  test("Should get an error passing wrong network to fromId", async () => {
    expect.assertions(1);
    try {
      await TestNetWallet.fromId(`wif:regtest:${process.env.PRIVATE_WIF}`);
    } catch (e: any) {
      expect(e.message.slice(0, 97)).toBe(
        "Network prefix regtest to a testnet wallet"
      );
    }
  });

  test("Should get the regtest wallet balance", async () => {
    // Build Alice's wallet from Wallet Import Format string, check sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = await RegTestWallet.fromId(
        `wif:regtest:${process.env.PRIVATE_WIF}`
      ); // insert WIF from #1
      expect(await alice.getBalance()).toBeGreaterThan(5000n * 100000000n);
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
          value: 1100n,
        },
      ]);
      expect(sendResponse!.txId!.length).toBe(64);
      expect(toBch(sendResponse.balance!)).toBeGreaterThan(0.01);
      // Build Bob's wallet from a public address, check his balance.
      const bobBalance = await bob.getBalance();
      expect(bobBalance).toBe(1100n);
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
          value: 1001n,
        },
        {
          cashaddr: bob.cashaddr!,
          value: 1000n,
        },
        // Using a larger amount here to test that it would indeed return as change to the sender when specified later.
        {
          cashaddr: bob.cashaddr!,
          value: 10001n,
        },
        // Using a second larger amount to assure that if too many utxos are specified, money the utxo isn't used
        {
          cashaddr: bob.cashaddr!,
          value: 10001n,
        },
      ]);
      let bobBalance = await bob.getBalance();
      expect(bobBalance).toBe(22003n);
      let bobUtxos = await bob.getUtxos();
      expect(bobUtxos.length).toBe(4);

      // Filter the list to only odd value utxos
      let oddUtxoIds = bobUtxos
        .filter((utxo) => utxo.satoshis % 2n == 1n)
        .map((utxo) => {
          return toUtxoId(utxo);
        });

      // Build Bob's wallet from a public address, check his balance.
      let sendResponse2 = await bob.send(
        [
          {
            cashaddr: charlie.cashaddr!,
            value: 1675n,
          },
        ],
        { utxoIds: oddUtxoIds }
      );
      expect(sendResponse2.balance!).toBe(19967n);
      expect(await charlie.getBalance()).toBe(1675n);
    }
  });

  test("Should send a transaction with change to different change address", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let funder = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF); // insert WIF from #1

      const alice = await createWallet({
        type: WalletTypeEnum.Wif,
        network: "regtest",
      });
      const bob = await createWallet({
        type: WalletTypeEnum.Wif,
        network: "regtest",
      });
      const charlie = await createWallet({
        type: WalletTypeEnum.Wif,
        network: "regtest",
      });
      await funder.send([
        {
          cashaddr: alice.cashaddr!,
          value: 3000n,
        },
      ]);

      let sendResponse = await alice.send(
        [
          {
            cashaddr: bob.cashaddr!,
            value: 1000n,
          },
        ],
        {
          changeAddress: charlie.cashaddr!,
        }
      );
      expect(await bob.getBalance()).toBe(1000n);
      expect(await charlie.getBalance()).toBe(1780n);
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
          value: 1001n,
        },
        {
          cashaddr: bob.cashaddr!,
          value: 1000n,
        },
        {
          cashaddr: bob.cashaddr!,
          value: 1001n,
        },
      ]);
      let bobBalance = await bob.getBalance();
      expect(bobBalance).toBe(3002n);
      let bobUtxos = await bob.getUtxos();
      expect(bobUtxos.length).toBe(3);

      // Filter the list to only odd value utxos
      let oddUtxoIds = bobUtxos
        .filter((utxo) => utxo.satoshis % 2n == 1n)
        .map((utxo) => {
          return toUtxoId(utxo);
        });

      // Build Bob's wallet from a public address, check his balance.
      let sendResponse2 = await bob.sendMax(charlie.cashaddr!, {
        utxoIds: oddUtxoIds,
      });
      expect(sendResponse2.balance!).toBe(1000n);
      expect(await charlie.getBalance()).toBeGreaterThan(1500n);
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
      await alice.send([
        [bob.cashaddr!, BigInt(await convert(usdRate, "Usd", "Sat"))],
      ]);
      // Build Bob's wallet from a public address, check his balance.
      const bobBalance = await bob.getBalance();

      expect(Math.floor(await convert(Number(bobBalance), "sat", "usd"))).toBe(
        Math.floor(usdRate)
      );
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

      await alice.send([[bob.cashaddr!, 1440n]]);
      await bob.send([[charlie.cashaddr!, 734n]]);
      // Build Bob's wallet from a public address, check his balance.
      const bobBalance = await bob.getBalance();
      // Build Bob's wallet from a public address, check his balance.
      const charlieBalance = await charlie.getBalance();
      expect(bobBalance).toBe(0n);
      expect(charlieBalance).toBe(734n);
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
      await alice.send([[bob.cashaddr!, 1200n]]);
      // Build Bob's wallet from a public address, check his balance.
      const bobBalance = await bob.getBalance();
      expect(bobBalance).toBe(1200n);
    }
  });

  test("Should get a random testnet wallet", async () => {
    let alice = await TestNetWallet.newRandom();
    const aliceBalance = await alice.getBalance();
    expect(alice.cashaddr!.slice(0, 9)).toBe("bchtest:q");
    expect(aliceBalance).toBe(0n);
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
        value: 3400n,
      },
    ]);

    // Build Bob's wallet from a public address, check his balance.
    const sendMaxResponse = await bob.sendMax(alice.cashaddr);
    expect(sendMaxResponse.txId!.length).toBe(64);

    //
    const bobBalanceFinal = await bob.getBalance();
    expect(bobBalanceFinal).toBe(0n);
  });

  test("Send all coins back on regtest", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats

    const alice = await RegTestWallet.fromWIF(process.env.PRIVATE_WIF!);
    const bob = await createWallet({
      type: WalletTypeEnum.Seed,
      network: "regtest",
      name: "Bob's random wallet",
    });

    const charlie = await createWallet({
      type: WalletTypeEnum.Seed,
      network: "regtest",
      name: "Charlie's random wallet",
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
        value: 3400n,
      },
      {
        cashaddr: bob.cashaddr,
        value: 3400n,
      },
      {
        cashaddr: bob.cashaddr,
        value: 3400n,
      },
      {
        cashaddr: bob.cashaddr,
        value: 3400n,
      },
      {
        cashaddr: bob.cashaddr,
        value: 3400n,
      },
    ]);

    // Send ALL of Bob's coins to Charlie.
    const sendMaxResponse = await bob.sendMax(charlie.cashaddr!);
    expect(sendMaxResponse.txId!.length).toBe(64);
    expect(sendMaxResponse.balance!).toBe(0n);

    const bobFinalBalance = await bob.getBalance();
    expect(bobFinalBalance).toBe(0n);

    // Send ALL of Charlie's coins to Alice.
    const sendMaxResponse2 = await charlie.sendMax(alice.cashaddr);
    expect(sendMaxResponse2.txId!.length).toBe(64);
    expect(sendMaxResponse2.balance!).toBe(0n);

    const charlieFinalBalance = await charlie.getBalance();
    expect(charlieFinalBalance).toBe(0n);
  });

  test("Set default derivation path", async () => {
    const savedDerivationPath = Config.DefaultParentDerivationPath;

    const wallet = await Wallet.newRandom();
    expect(wallet.parentDerivationPath).toBe("m/44'/0'/0'");
    expect(wallet.derivationPath).toBe("m/44'/0'/0'/0/0");

    Config.DefaultParentDerivationPath = "m/44'/145'/0'";
    const otherWallet = await Wallet.newRandom();
    expect(otherWallet.parentDerivationPath).toBe("m/44'/145'/0'");
    expect(otherWallet.derivationPath).toBe("m/44'/145'/0'/0/0");

    const binsAreEqual = (a, b) => {
      if (a.length !== b.length) {
        return false;
      }
      // eslint-disable-next-line functional/no-let, functional/no-loop-statement, no-plusplus
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          return false;
        }
      }
      return true;
    };

    expect(binsAreEqual(wallet.privateKey!, otherWallet.privateKey!)).toBe(
      false
    );

    Config.DefaultParentDerivationPath = savedDerivationPath;
  });
});

describe(`Tests named wallet creation`, () => {
  test("Expect a nameless named wallet to error", async () => {
    expect.assertions(1);
    try {
      await Wallet.named("");
    } catch (e: any) {
      expect(e.message).toBe("Named wallets must have a non-empty name");
    }
  });

  test("Expect force saving over a named wallet to fail", async () => {
    expect.assertions(1);
    try {
      await RegTestWallet.named("duplicate_name", "dup_test");
      await RegTestWallet.named("duplicate_name", "dup_test", true);
    } catch (e: any) {
      expect(e.message).toBe(
        "A wallet with the name duplicate_name already exists in dup_test"
      );
    }
  });

  test("Store and replace a Regtest wallet", async () => {
    const name = `storereplace ${Math.random()}`;
    expect(await RegTestWallet.namedExists(name)).toBe(false);
    let w1 = await RegTestWallet.named(name);
    expect(await RegTestWallet.namedExists(name)).toBe(true);

    let seedId = (
      await RegTestWallet.fromSeed(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
      )
    ).toDbString();
    let w3 = await RegTestWallet.replaceNamed(name, seedId);
    let w4 = await RegTestWallet.named(name);
    expect(w4.toDbString()).not.toBe(w1.toDbString());
    expect(w4.toDbString()).toBe(seedId);

    let w5 = await RegTestWallet.replaceNamed(`${name}_nonexistent`, seedId);
    let w6 = await RegTestWallet.named(`${name}_nonexistent`);
    expect(w6.toDbString()).toBe(w5.toDbString());
  });
});
