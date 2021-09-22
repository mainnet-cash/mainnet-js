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
});
