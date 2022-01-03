import { createWallet } from "./createWallet";
import { initProviders, disconnectProviders, WalletRequestI } from "mainnet-js";

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe(`Named Wallets`, () => {
  test("Create smartbch wallet", async () => {
    const req = {
      type: "privkey",
      network: "mainnet",
      platform: "smartbch",
    } as WalletRequestI;
    let w = await createWallet(req);
    expect(w.getDepositAddress()).toMatch(/0x/);
    expect(w.walletType).toBe("privkey");
  });
  test("Create a named smartbch wallet", async () => {
    const req = {
      name: "sbch bobs wallet 2",
      network: "regtest",
    } as WalletRequestI;
    let w = await createWallet(req);
    expect(w.getDepositAddress()).toMatch(/0x/);
    expect(w.walletType).toBe("seed");
  });
  test("Create a named smartbch wallet", async () => {
    const req = {
      name:"sbch Bob's Regtest Wallet 2",
      type:"seed",
      network:"regtest"
    } as WalletRequestI;
    let w = await createWallet(req);
    expect(w.getDepositAddress()).toMatch(/0x/);
    expect(w.walletType).toBe("seed");
  });
});
