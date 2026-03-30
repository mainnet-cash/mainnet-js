import { BaseWallet, TestNetWallet, Wallet } from "mainnet-js";
import { IndexedDBProvider } from "./index";

describe("WalletDatabase should handle indexeddb", () => {
  beforeAll(() => {
    BaseWallet.StorageProvider = IndexedDBProvider;
  });

  test("Should store and recall a testnet wallet", async () => {
    let w1 = await TestNetWallet.newRandom("Testnet Wallet 1");
    let w1Again = await TestNetWallet.named("Testnet Wallet 1");
    expect(w1.name).toBe("Testnet Wallet 1");
    expect(w1.cashaddr!.slice(0, 9)).toBe("bchtest:q");
    expect(w1.privateKeyWif!.startsWith("c")).toBeTruthy();
    expect(w1.network).toBe("testnet");
    expect(w1.name).toBe(w1Again.name);
    expect(w1.privateKeyWif).toBe(w1Again.privateKeyWif);
  });

  test("Should store and recall a mainnet wallet", async () => {
    let w1 = await Wallet.named("Mainnet Wallet 1");
    let w1Again = await Wallet.named("Mainnet Wallet 1");
    expect(w1.name!.startsWith("Mainnet Wallet 1")).toBeTruthy();
    expect(w1.cashaddr!.startsWith("bitcoincash:q")).toBeTruthy();
    expect(w1.network).toBe("mainnet");
    expect(
      w1.privateKeyWif![0] == "K" || w1.privateKeyWif![0] == "L",
    ).toBeTruthy();
    expect(w1.name).toBe(w1Again.name);
    expect(w1.privateKeyWif).toBe(w1Again.privateKeyWif);
  });
});
