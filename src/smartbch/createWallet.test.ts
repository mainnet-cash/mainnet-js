import { createWallet } from "./createWallet";
import { WalletRequestI } from "../wallet/interface";

describe(`SmartBch Wallets`, () => {
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
