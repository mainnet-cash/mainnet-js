import { RegTestWallet, TestNetWallet, Wallet } from "./Wif";
import { bchParam } from "../chain"
import {
  BalanceResponse,
} from "../util/balanceObjectFromSatoshi";

describe(`Test creation of wallet from walletId`, () => {
  test("Get a regtest wallet from string id", async () => {
    let w = (await RegTestWallet.fromId(
      "wif:regtest:cQAurrWpGpAtvKcGWvTYFpiTickpTUa3YzXkXpbqD342pscjbCxH"
    )) as RegTestWallet;
    expect(w.cashaddr!.startsWith("bchreg:")).toBeTruthy();
  });

  test("Get a testnet wallet from string id", async () => {
    let w = (await TestNetWallet.fromId(
      "wif:testnet:cPS12C2bpGHtKjS5NXNyWyTGGRMPk7D7pjp5JfgxRKWyFnWoDyZg"
    )) as TestNetWallet;
    expect(w.cashaddr!.startsWith("bchtest:")).toBeTruthy();
  });

  test("Get a mainnet wallet from string id", async () => {
    let w = (await Wallet.fromId(
      "wif:mainnet:KysvoRyDkxQycBGj49K8oC3minAfoXnVmkcgx6UsZx3g2VvyGCAa"
    )) as Wallet;
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
        expect(e.message).toBe("Wallet type hd was passed to single address wallet");
      }
    });

    test("Expect Error passing unknown wallet", async () => {
      expect.assertions(1);
      try {
        await Wallet.fromId(
          "q2k:mainnet:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
        );
      } catch (e) {
        expect(e.message).toBe("Wallet type q2k was passed to single address wallet");
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

describe(`Watch only Wallets`, () => {
  test("Create a watch only testnet wallet from string id", async () => {
    let w = (await TestNetWallet.fromId(
      "watch:testnet:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22"
    ) as Wallet);
    expect(w.network).toBe("testnet");
    expect(w.networkPrefix).toBe("bchtest");
    expect(w.cashaddr).toBe("qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22");
  });

  test("Create a watch only mainnet wallet from string id", async () => {
    let w = (await Wallet.fromId(
      "watch:mainnet:qp6e6enhpy0fwwu7nkvlr8rgl06ru0c9lywalz8st5"
    )) as Wallet;
    expect(w.network).toBe("mainnet");
    expect(w.networkPrefix).toBe("bitcoincash");
    expect(w.cashaddr).toBe("qp6e6enhpy0fwwu7nkvlr8rgl06ru0c9lywalz8st5");
  });

  test("Should get the regtest wallet balance", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.ADDRESS) {
      throw Error("Attempted to pass an empty address");
    } else {
      let alice = (await RegTestWallet.watchOnly(
        process.env.ADDRESS
      )) as RegTestWallet; // insert WIF from #1
      // Build Bob's wallet from a public address, check his balance.
      const aliceBalance = (await alice.getBalance()) as BalanceResponse;
      expect(aliceBalance.bch).toBeGreaterThan(5000);
      expect(await alice.getBalance("sat")).toBeGreaterThan(
        5000 * bchParam.subUnits
      );
    }
  });

  test("Should get the testnet wallet balance", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = (await TestNetWallet.watchOnly(
        process.env.ALICE_TESTNET_ADDRESS
      )) as TestNetWallet; // insert WIF from #1
      // Build Bob's wallet from a public address, check his balance.
      const aliceBalance = (await alice.getBalance()) as BalanceResponse;
      expect(aliceBalance.sat).toBeGreaterThan(2000);
    }
  });
});