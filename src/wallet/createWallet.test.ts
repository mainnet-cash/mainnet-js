import { CashAddressNetworkPrefix } from "@bitauth/libauth";
import { walletFromId, named } from "./createWallet";

describe(`Test creation of wallet from walletId`, () => {
  test("Get a regtest wallet from string id", async () => {
    let w = await walletFromId(
      "wif:regtest:cQAurrWpGpAtvKcGWvTYFpiTickpTUa3YzXkXpbqD342pscjbCxH"
    );
    expect(w.cashaddr!.startsWith("bchreg:")).toBeTruthy();
  });

  test("Get a testnet wallet from string id", async () => {
    let w = await walletFromId(
      "wif:testnet:cPS12C2bpGHtKjS5NXNyWyTGGRMPk7D7pjp5JfgxRKWyFnWoDyZg"
    );
    expect(w.cashaddr!.startsWith("bchtest:")).toBeTruthy();
  });

  test("Get a mainnet wallet from string id", async () => {
    let w = await walletFromId(
      "wif:mainnet:KysvoRyDkxQycBGj49K8oC3minAfoXnVmkcgx6UsZx3g2VvyGCAa"
    );
    expect(w.cashaddr!.startsWith("bitcoincash")).toBeTruthy();
  });

  test("Create a watch only testnet wallet from string id", async () => {
    let w = await walletFromId(
      "watch:testnet:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22"
    );
    expect(w.cashaddr).toBe("bchtest:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22");
  });


  test("Create a watch only mainnet wallet from string id", async () => {
    let w = await walletFromId(
      "watch:mainnet:qp6e6enhpy0fwwu7nkvlr8rgl06ru0c9lywalz8st5"
    );
    expect(w.cashaddr).toBe("bitcoincash:qp6e6enhpy0fwwu7nkvlr8rgl06ru0c9lywalz8st5");
  });

  describe(`Errors from walletId`, () => {
    test("Expect Error passing testnet wallet to mainnet", async () => {
      expect.assertions(1);
      try {
        await walletFromId(
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
        await walletFromId(
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
        await walletFromId(
          "hd:mainnet:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
        );
      } catch (e) {
        expect(e.message).toBe("Heuristic Wallets are not implemented");
      }
    });

    test("Expect Error passing unknown wallet", async () => {
      expect.assertions(1);
      try {
        await walletFromId(
          "q2k:mainnet:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
        );
      } catch (e) {
        expect(e.message).toBe("The wallet type: q2k was not understood");
      }
    });

  });

});

describe(`Tests named wallet creation`, () => {

  test("Expect a nameless named wallet to error", async () => {
    expect.assertions(1);
    try {
      await named("");
    } catch (e) {
      expect(e.message).toBe(
        "Named wallets must have a non-empty name"
      );
    }
  });

  test("Expect force saving over a named wallet to fail", async () => {
    expect.assertions(1);
    try {
      await named("duplicate_name", CashAddressNetworkPrefix.regtest, "dup_test");
      await named("duplicate_name", CashAddressNetworkPrefix.regtest, "dup_test", true);
    } catch (e) {
      expect(e.message).toBe(
        "A wallet with the name duplicate_name already exists in dup_test"
      );
    }
  });

});