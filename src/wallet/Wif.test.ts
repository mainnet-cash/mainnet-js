import { RegTestWallet, TestNetWallet, Wallet } from "./Wif";
import { bchParam } from "../chain";
import { BalanceResponse } from "../util/balanceObjectFromSatoshi";
import { UnitEnum } from "../enum";
import { initProviders, disconnectProviders } from "../network/Connection";
import { DUST_UTXO_THRESHOLD as DUST } from "../constant";
import { delay } from "../util/delay";
import { OpReturnData, SendResponse } from "./model";
import { ElectrumRawTransaction } from "../network/interface";
import { binToHex, binToUtf8, hexToBin, utf8ToBin } from "@bitauth/libauth";

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe(`Test creation of wallet from walletId`, () => {
  test("Get a regtest wallet from string id", async () => {
    let w = await RegTestWallet.fromId(
      "wif:regtest:cQAurrWpGpAtvKcGWvTYFpiTickpTUa3YzXkXpbqD342pscjbCxH"
    );
    expect(w.cashaddr!.startsWith("bchreg:")).toBeTruthy();
    expect(w.publicKey!.length).toBe(65);
    expect(w.publicKeyCompressed!.length).toBe(33);
    expect(w.privateKey!.length).toBe(32);
    expect(w.publicKeyHash!.length).toBe(20);
    expect(w.privateKeyWif !== "undefined").toBeTruthy();
  });

  test("Should get a new random wallet", async () => {
    let w = await RegTestWallet.newRandom();
    expect(w.cashaddr!.startsWith("bchreg:")).toBeTruthy();
    expect(w.publicKey!.length).toBe(65);
    expect(w.publicKeyCompressed!.length).toBe(33);
    expect(w.privateKey!.length).toBe(32);
    expect(w.publicKeyHash!.length).toBe(20);
    expect(w.privateKeyWif !== "undefined").toBeTruthy();
  });

  test("Should get a regtest wallet from wif id string", async () => {
    let w = await RegTestWallet.fromId(process.env.ALICE_ID!);
    expect(w.cashaddr!.startsWith("bchreg:")).toBeTruthy();
    expect(w.publicKey!.length).toBe(65);
    expect(w.publicKeyCompressed!.length).toBe(33);
    expect(w.privateKey!.length).toBe(32);
    expect(w.publicKeyHash!.length).toBe(20);
    expect(w.privateKeyWif !== "undefined").toBeTruthy();
  });

  test("Should get a regtest wallet from seed id string", async () => {
    let w = await RegTestWallet.fromId(process.env.BOB_ID!);
    expect(w.cashaddr!.startsWith("bchreg:")).toBeTruthy();
    expect(w.publicKey!.length).toBe(65);
    expect(w.publicKeyCompressed!.length).toBe(33);
    expect(w.privateKey!.length).toBe(32);
    expect(w.publicKeyHash!.length).toBe(20);
    expect(w.privateKeyWif !== "undefined").toBeTruthy();
  });

  test("Get a testnet wallet from string id", async () => {
    let w = await TestNetWallet.fromId(
      "wif:testnet:cPS12C2bpGHtKjS5NXNyWyTGGRMPk7D7pjp5JfgxRKWyFnWoDyZg"
    );
    expect(w.publicKey!.length).toBe(65);
    expect(w.publicKeyCompressed!.length).toBe(33);
    expect(w.privateKey!.length).toBe(32);
    expect(w.publicKeyHash!.length).toBe(20);
    expect(w.cashaddr!.startsWith("bchtest:")).toBeTruthy();
  });

  test("Get a mainnet wallet from string id", async () => {
    let w = await Wallet.fromId(
      "wif:mainnet:KysvoRyDkxQycBGj49K8oC3minAfoXnVmkcgx6UsZx3g2VvyGCAa"
    );
    expect(w.publicKey!.length).toBe(65);
    expect(w.privateKey!.length).toBe(32);
    expect(w.publicKeyHash!.length).toBe(20);
    expect(w.cashaddr!.startsWith("bitcoincash")).toBeTruthy();
  });

  describe(`Errors from walletId`, () => {
    test("Expect Error passing testnet wallet to mainnet", async () => {
      expect.assertions(1);
      try {
        await TestNetWallet.fromId(
          "wif:testnet:KysvoRyDkxQycBGj49K8oC3minAfoXnVmkcgx6UsZx3g2VvyGCAa"
        );
      } catch (e) {
        expect(e.message).toBe(
          "Testnet type wif KysvoRyDkxQycBGj49K8oC3minAfoXnVmkcgx6UsZx3g2VvyGCAa passed, should start with c"
        );
      }
    });

    test("Expect Error passing mainnet wallet to testnet", async () => {
      expect.assertions(1);
      try {
        await Wallet.fromId(
          "wif:mainnet:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
        );
      } catch (e) {
        expect(e.message).toBe(
          "Mainnet type wif cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6 passed, should start with L or K"
        );
      }
    });

    test("Expect Error passing hd wallet", async () => {
      expect.assertions(1);
      try {
        await Wallet.fromId(
          "hd:mainnet:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
        );
      } catch (e) {
        expect(e.message).toBe(
          "Unknown wallet type 'hd'"
        );
      }
    });

    test("Expect Error passing unknown wallet", async () => {
      expect.assertions(1);
      try {
        await Wallet.fromId(
          "q2k:mainnet:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
        );
      } catch (e) {
        expect(e.message).toBe(
          "Unknown wallet type 'q2k'"
        );
      }
    });
  });
});

describe(`Tests named wallet creation`, () => {
  test("Expect a nameless named wallet to error", async () => {
    expect.assertions(1);
    try {
      await Wallet.named("");
    } catch (e) {
      expect(e.message).toBe("Named wallets must have a non-empty name");
    }
  });

  test("Expect force saving over a named wallet to fail", async () => {
    expect.assertions(1);
    try {
      await RegTestWallet.named("duplicate_name", "dup_test");
      await RegTestWallet.named("duplicate_name", "dup_test", true);
    } catch (e) {
      expect(e.message).toBe(
        "A wallet with the name duplicate_name already exists in dup_test"
      );
    }
  });
});

describe(`Mnemonic wallet creation`, () => {
  test("Expect '11x abandon about' to have the correct key, seed and path", async () => {
    let w = await Wallet.fromId(
      "seed:mainnet:abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    );
    expect(w.cashaddr!).toBe(
      "bitcoincash:qrvcdmgpk73zyfd8pmdl9wnuld36zh9n4gms8s0u59"
    );
    expect(w.privateKeyWif!).toBe(
      "L4p2b9VAf8k5aUahF1JCJUzZkgNEAqLfq8DDdQiyAprQAKSbu8hf"
    );
    expect(w.getSeed().seed).toBe(
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    );
    expect(w.getSeed().derivationPath).toBe("m/44'/0'/0'/0/0");
    const info = {
      cashaddr: "bitcoincash:qrvcdmgpk73zyfd8pmdl9wnuld36zh9n4gms8s0u59",
      isTestnet: false,
      name: "",
      network: "mainnet",
      privateKey:
        "e284129cc0922579a535bbf4d1a3b25773090d28c909bc0fed73b5e0222cc372",
      privateKeyWif: "L4p2b9VAf8k5aUahF1JCJUzZkgNEAqLfq8DDdQiyAprQAKSbu8hf",
      publicKey:
        "04aaeb52dd7494c361049de67cc680e83ebcbbbdbeb13637d92cd845f70308af5e9370164133294e5fd1679672fe7866c307daf97281a28f66dca7cbb52919824f",
      publicKeyHash: "d986ed01b7a22225a70edbf2ba7cfb63a15cb3aa",

      derivationPath: "m/44'/0'/0'/0/0",
      seed: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",

      walletDbEntry:
        "seed:mainnet:abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about:m/44'/0'/0'/0/0",
      walletId:
        "seed:mainnet:abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about:m/44'/0'/0'/0/0",
    };
    expect(w.getInfo()).toEqual(info);
  });

  test("Expect '11x abandon about' to have the correct key, seed and path when generated on 145' coin path", async () => {
    let w = await Wallet.fromId(
      "seed:mainnet:abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about:m/44'/145'/0'/0/0"
    );
    expect(w.cashaddr!).toBe(
      "bitcoincash:qqyx49mu0kkn9ftfj6hje6g2wfer34yfnq5tahq3q6"
    );
    expect(w.privateKeyWif!).toBe(
      "KxbEv3FeYig2afQp7QEA9R3gwqdTBFwAJJ6Ma7j1SkmZoxC9bAXZ"
    );
    expect(w.getSeed().seed).toBe(
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    );
    expect(w.getSeed().derivationPath).toBe("m/44'/145'/0'/0/0");
  });
  test("Expect '11x abandon about' to have the correct key, seed and path from regtest wallet", async () => {
    let w = await RegTestWallet.fromId(
      "seed:regtest:abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    );
    expect(w.cashaddr!).toBe(
      "bchreg:qrvcdmgpk73zyfd8pmdl9wnuld36zh9n4g974kwcsl"
    );
    expect(w.privateKeyWif!).toBe(
      "cVB244V26CSLjv3xdR7KfoVdNufdqHSMuAMgjqBUfwWQR4WVFsky"
    );
    expect(w.getSeed().seed).toBe(
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    );
    expect(w.getSeed().derivationPath).toBe("m/44'/0'/0'/0/0");
  });
});

describe(`Watch only Wallets`, () => {
  test("Create a watch only testnet wallet from string id", async () => {
    let w = await TestNetWallet.fromId(
      "watch:testnet:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22"
    );
    expect(w.network).toBe("testnet");
    expect(w.networkPrefix).toBe("bchtest");
    expect(w.cashaddr).toBe(
      "bchtest:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22"
    );
  });

  test("Create a watch only regtest wallet from string id", async () => {
    let w = await RegTestWallet.fromId(
      "watch:regtest:qql8ypk6y9qksmjj2qp3r5fr3ne35ltkzss902evnt"
    );
    if (!w) {
      throw Error("Could not derive wallet");
    }

    // the balance unit may also be empty
    let unit;
    expect(((await w.getBalance(unit)) as BalanceResponse).sat).toBe(0);
    expect(w.network).toBe("regtest");
    expect(w.networkPrefix).toBe("bchreg");
    expect(w.cashaddr).toBe(
      "bchreg:qql8ypk6y9qksmjj2qp3r5fr3ne35ltkzss902evnt"
    );
  });

  test("Create a watch only mainnet wallet from string id", async () => {
    let w = await Wallet.fromId(
      "watch:mainnet:qp6e6enhpy0fwwu7nkvlr8rgl06ru0c9lywalz8st5"
    );
    expect(w.network).toBe("mainnet");
    expect(w.networkPrefix).toBe("bitcoincash");
    expect(w.cashaddr).toBe(
      "bitcoincash:qp6e6enhpy0fwwu7nkvlr8rgl06ru0c9lywalz8st5"
    );
  });

  test("Should get the regtest wallet balance", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.ADDRESS) {
      throw Error("Attempted to pass an empty address");
    } else {
      let alice = await RegTestWallet.watchOnly(process.env.ADDRESS); // insert WIF from #1
      // Build Bob's wallet from a public address, check his balance.
      expect(alice.getPublicKeyHash()!.length).toBe(20);
      const aliceBalance = (await alice.getBalance()) as BalanceResponse;
      expect(aliceBalance.bch).toBeGreaterThan(5000);
      expect(await alice.getBalance("sat")).toBeGreaterThan(
        5000 * bchParam.subUnits
      );
    }
  });

  test("Should send to a testnet coins to a random address", async () => {
    if (!process.env.ALICE_TESTNET_WALLET_ID) {
      throw Error("Attempted to pass an empty address");
    } else {
      let alice = await TestNetWallet.fromId(
        process.env.ALICE_TESTNET_WALLET_ID
      ); // insert WIF from #1
      // Build Bob's wallet from a public address, check his balance.
      expect(alice.getPublicKeyHash()!.length).toBe(20);
      let aliceBalance = await alice.send([
        { cashaddr: alice.cashaddr!, value: 526, unit: "sat" },
      ]);
      expect(aliceBalance.explorerUrl!).toContain("explorer.bitcoin.com");
      expect(aliceBalance.balance!.sat!).toBeGreaterThan(5000);
    }
  });

  test("Should get the testnet wallet balance", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = await TestNetWallet.watchOnly(
        process.env.ALICE_TESTNET_ADDRESS!
      ); // insert WIF from #1
      // Build Bob's wallet from a public address, check his balance.
      const aliceBalance = (await alice.getBalance()) as BalanceResponse;
      expect(aliceBalance.sat).toBeGreaterThan(2000);
    }
  });
});
describe(`Wallet subscriptions`, () => {
  test("Should wait for transaction", async () => {
    const aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromId(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();

    setTimeout(
      () =>
        aliceWallet.send([
          {
            cashaddr: bobWallet.cashaddr!,
            value: 1000,
            unit: "satoshis",
          },
        ]),
      0
    );

    let tx = await bobWallet.waitForTransaction();
    expect(tx!.hash).not.toBe("");

    await bobWallet.sendMax(aliceWallet.cashaddr!);
  });

  test("Create two wallets, get balances concurrently", async () => {
    let balance1 = 999,
      balance2 = 666;
    Wallet.newRandom().then((wallet) =>
      wallet.getBalance("sat").then((balance) => (balance1 = balance as number))
    );
    Wallet.newRandom().then((wallet) =>
      wallet.getBalance("sat").then((balance) => (balance2 = balance as number))
    );
    await delay(5000);
    expect(balance1).toBe(0);
    expect(balance2).toBe(0);
  });

  test("Should watch then wait", async () => {
    const aliceWallet = await RegTestWallet.newRandom();

    let cancel = aliceWallet.watchBalance(() => {});

    cancel();
  });

  test("Should wait for balance", async () => {
    const aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromId(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();

    aliceWallet.send([
      {
        cashaddr: bobWallet.cashaddr!,
        value: 2000,
        unit: "satoshis",
      },
    ]);

    let balance = await bobWallet.waitForBalance(2000, UnitEnum.SATOSHIS);
    expect(balance).toBeGreaterThanOrEqual(2000);
    await bobWallet.sendMax(aliceWallet.cashaddr!);
  });

  test("Should watch balance, then waitForBalance, then cancel watch", async () => {
    const aliceId = `wif:regtest:${process.env.PRIVATE_WIF!}`;
    const alice = await RegTestWallet.fromId(aliceId);
    const bob = await RegTestWallet.newRandom();
    alice.send([
      {
        cashaddr: bob.cashaddr!,
        value: 2000,
        unit: "satoshis",
      },
    ]);

    let cancel = bob.watchBalance(() => {});
    let balance = await bob.waitForBalance(2000, "sat");
    expect(balance).toBe(2000);
    cancel();
    //expect(bobAny.sat).toBe(2000);
  });

  test("Should watch multiple wallets", async () => {
    const aliceId = `wif:regtest:${process.env.PRIVATE_WIF!}`;
    const alice = await RegTestWallet.fromId(aliceId);
    const bob = await RegTestWallet.newRandom();
    const charlie = await RegTestWallet.newRandom();
    const dave = await RegTestWallet.newRandom();

    setTimeout(
      () =>
        alice.send([
          {
            cashaddr: bob.cashaddr!,
            value: 1000,
            unit: "satoshis",
          },
        ]),
      600
    );

    let bobBalance = await bob.waitForBalance(1000, "sat").catch((e) => {
      throw e;
    });
    setTimeout(
      () =>
        alice.send([
          {
            cashaddr: charlie.cashaddr!,
            value: 1000,
            unit: "satoshis",
          },
        ]),
      600
    );
    let charlieBalance = await charlie.waitForBalance(1000, "sat");
    setTimeout(
      () =>
        alice.send([
          {
            cashaddr: dave.cashaddr!,
            value: 1000,
            unit: "satoshis",
          },
        ]),
      600
    );
    let daveBalance = await dave.waitForBalance(1000, "sat");
    expect(bobBalance).toBe(1000);
    expect(charlieBalance).toBe(1000);
    expect(daveBalance).toBe(1000);
    setTimeout(
      () =>
        alice.send([
          {
            cashaddr: bob.cashaddr!,
            value: 1000,
            unit: "satoshis",
          },
        ]),
      600
    );
    let bobTx = await bob.waitForTransaction();
    expect(bobTx!.version).toBe(2);
    setTimeout(
      () =>
        alice.send([
          {
            cashaddr: bob.cashaddr!,
            value: 1000,
            unit: "satoshis",
          },
        ]),
      600
    );
    bobTx = await bob.waitForTransaction();
    expect(bobTx!.version).toBe(2);
    setTimeout(
      () =>
        alice.send([
          {
            cashaddr: bob.cashaddr!,
            value: 1000,
            unit: "satoshis",
          },
        ]),
      600
    );
    bobTx = await bob.waitForTransaction();
    expect(bobTx!.version).toBe(2);
    expect(await bob.getBalance("sat")).toBe(4000);
  });

  test.skip("Should get testnet satoshis and send them back", async () => {
    const wallet = (await TestNetWallet.newRandom()) as TestNetWallet;
    const txid = await wallet.getTestnetSatoshis();
    expect(txid.length).toBe(64);
    const balance = await wallet.getBalance("sat");
    expect(balance).toBe(10000);

    const response = await wallet.returnTestnetSatoshis();
    delay(3000);
    expect(response.balance!.sat!).toBe(0);
  });

  test.skip("Should get testnet slp tokens and send them back", async () => {
    let aliceWif = `${process.env.ALICE_TESTNET_WALLET_ID!}`;
    let aliceWallet = await TestNetWallet.fromId(aliceWif);

    const wallet = (await TestNetWallet.newRandom()) as TestNetWallet;

    // send bob some bch gas to enable him to send slp
    await aliceWallet
      .slpAware()
      .send([{ cashaddr: wallet.cashaddr!, value: 5000, unit: "sat" }]);

    const txid = await wallet.getTestnetSlp("MNC");
    expect(txid.length).toBe(64);
    let balance = await wallet.slp.getBalance("MNC");
    expect(balance[0].value.toNumber()).toBe(10);

    const tokenId = balance[0].tokenId;
    const response = await wallet.returnTestnetSlp(tokenId);
    expect(response.balance).toBe(0);

    await wallet.slpAware(false).sendMax(aliceWallet.cashaddr!);
  });
});

describe(`Wallet extrema behavior regression testing`, () => {
  test(`Should operate very well above dust threshold (${
    DUST * 3
  }), 'min relay fee not met (code 66)' regression`, async () => {
    const aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromId(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();
    const charlieWallet = await RegTestWallet.newRandom();

    await aliceWallet.send([
      { cashaddr: bobWallet.cashaddr!, value: DUST, unit: "sat" },
      { cashaddr: bobWallet.cashaddr!, value: DUST * 3, unit: "sat" },
    ]);

    await bobWallet.send({
      cashaddr: charlieWallet.cashaddr!,
      value: DUST,
      unit: "sat",
    });
    expect(await charlieWallet.getBalance("sat")).toBe(DUST);
  });

  test(`Should operate very well above dust threshold (${
    DUST * 2
  }), 'min relay fee not met (code 66)' regression`, async () => {
    const aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromId(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();
    const charlieWallet = await RegTestWallet.newRandom();

    await aliceWallet.send([
      { cashaddr: bobWallet.cashaddr!, value: DUST, unit: "sat" },
      { cashaddr: bobWallet.cashaddr!, value: DUST * 2, unit: "sat" },
    ]);

    await bobWallet.send({
      cashaddr: charlieWallet.cashaddr!,
      value: DUST,
      unit: "sat",
    });
    expect(await charlieWallet.getBalance("sat")).toBe(DUST);
  });

  test(`Should operate well above dust threshold (${
    DUST + 328
  }), 'min relay fee not met (code 66)' regression`, async () => {
    const aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromId(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();
    const charlieWallet = await RegTestWallet.newRandom();

    await aliceWallet.send([
      { cashaddr: bobWallet.cashaddr!, value: DUST, unit: "sat" },
      { cashaddr: bobWallet.cashaddr!, value: DUST + 328, unit: "sat" },
    ]);

    await bobWallet.send([
      { cashaddr: charlieWallet.cashaddr!, value: DUST, unit: "sat" },
    ]);
    expect(await charlieWallet.getBalance("sat")).toBe(DUST);
  });

  test(`Should operate slightly above dust threshold (${
    DUST + 1
  }), 'min relay fee not met (code 66)' regression`, async () => {
    const aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromId(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();
    const charlieWallet = await RegTestWallet.newRandom();

    await aliceWallet.send([
      { cashaddr: bobWallet.cashaddr!, value: DUST, unit: "sat" },
      { cashaddr: bobWallet.cashaddr!, value: DUST + 1, unit: "sat" },
    ]);

    await bobWallet.send([
      { cashaddr: charlieWallet.cashaddr!, value: DUST, unit: "sat" },
    ]);
    expect(await charlieWallet.getBalance("sat")).toBe(DUST);
  });

  test(`Should operate with dust threshold (${DUST}), 'min relay fee not met (code 66)' regression`, async () => {
    const aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromId(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();
    const charlieWallet = await RegTestWallet.newRandom();

    await aliceWallet.send([
      { cashaddr: bobWallet.cashaddr!, value: DUST, unit: "sat" },
      { cashaddr: bobWallet.cashaddr!, value: DUST, unit: "sat" },
    ]);

    await bobWallet.send([
      { cashaddr: charlieWallet.cashaddr!, value: DUST, unit: "sat" },
    ]);
    expect(await charlieWallet.getBalance("sat")).toBe(DUST);
  });
  test(`Should throw error with dust amounts (${
    DUST - 1
  }), 'min relay fee not met (code 66)' regression`, async () => {
    expect.assertions(1);
    try {
      const aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;
      const aliceWallet = await RegTestWallet.fromId(aliceWif);
      const bobWallet = await RegTestWallet.newRandom();
      const charlieWallet = await RegTestWallet.newRandom();

      await aliceWallet.send([
        { cashaddr: bobWallet.cashaddr!, value: DUST, unit: "sat" },
        { cashaddr: bobWallet.cashaddr!, value: DUST - 1, unit: "sat" },
      ]);

      await bobWallet.send([
        { cashaddr: charlieWallet.cashaddr!, value: DUST, unit: "sat" },
      ]);
    } catch (e) {
      expect(e.message).toBe(
        `the transaction was rejected by network rules.\n\ndust (code 64)\n`
      );
    }
  });

  test("Store and replace a Regtest wallet", async () => {
    const name = `storereplace ${Math.random()}`;
    expect(await RegTestWallet.namedExists(name)).toBe(false);
    let w1 = await RegTestWallet.named(name);
    expect(await RegTestWallet.namedExists(name)).toBe(true);

    let seedId = (
      await RegTestWallet.fromSeed(new Array(12).join("abandon "))
    ).toDbString();
    let w3 = await RegTestWallet.replaceNamed(name, seedId);
    let w4 = await RegTestWallet.named(name);
    expect(w4.toDbString()).not.toBe(w1.toDbString());
    expect(w4.toDbString()).toBe(seedId);

    let w5 = await RegTestWallet.replaceNamed(`${name}_nonexistent`, seedId);
    let w6 = await RegTestWallet.named(`${name}_nonexistent`);
    expect(w6.toDbString()).toBe(w5.toDbString());
  });

  test("Send op_return data", async () => {
    let wallet = await RegTestWallet.fromId(process.env.ALICE_ID!);
    let result: SendResponse, transaction: ElectrumRawTransaction;

    result = await wallet.send([
      OpReturnData.from("MEMO\x10LÖL😅"),
      { cashaddr: wallet.cashaddr!, value: 546, unit: "sats" },
    ]);
    transaction = (await wallet.provider!.getRawTransactionObject(
      result.txId!
    )) as ElectrumRawTransaction;
    expect(transaction.vout[0].scriptPubKey.asm).toContain("OP_RETURN");
    expect(transaction.vout[0].scriptPubKey.hex.slice(6)).toBe(
      binToHex(utf8ToBin("MEMO\x10LÖL😅"))
    );

    result = await wallet.send([
      [wallet.cashaddr!, 546, "sats"],
      ["OP_RETURN", Buffer.from([0x00, 0x01, 0x02])],
    ]);
    transaction = (await wallet.provider!.getRawTransactionObject(
      result.txId!
    )) as ElectrumRawTransaction;
    expect(transaction.vout[1].scriptPubKey.asm).toContain("OP_RETURN");
    expect([
      ...hexToBin(transaction.vout[1].scriptPubKey.hex.slice(6)),
    ]).toStrictEqual([0x00, 0x01, 0x02]);

    result = await wallet.send([
      OpReturnData.from(""),
      OpReturnData.from(Buffer.from([])),
    ]);
    transaction = (await wallet.provider!.getRawTransactionObject(
      result.txId!
    )) as ElectrumRawTransaction;
    expect(transaction.vout[0].scriptPubKey.asm).toContain("OP_RETURN");
    expect([...hexToBin(transaction.vout[0].scriptPubKey.hex)]).toStrictEqual([
      0x6a, 0x4c, 0x00,
    ]);
    expect(transaction.vout[1].scriptPubKey.asm).toContain("OP_RETURN");
    expect([...hexToBin(transaction.vout[1].scriptPubKey.hex)]).toStrictEqual([
      0x6a, 0x4c, 0x00,
    ]);
  });
});
