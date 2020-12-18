import { createWallet } from "./createWallet";
import { WalletRequestI } from "./interface";

describe(`Named Wallets`, () => {
  test("Get create a regtest wallet", async () => {
    const req = { network: "regtest" } as WalletRequestI;
    let w = await createWallet(req);
    expect(w.cashaddr).toMatch(/bchreg:/);
    expect(w.walletType).toBe("seed");
  });

  test("Get create a regtest wif wallet", async () => {
    const req = {
      network: "regtest",
      type: "wif",
    } as WalletRequestI;
    let w = await createWallet(req);
    expect(w.cashaddr).toMatch(/bchreg:/);
    expect(w.walletType).toBe("wif");
  });
  test("Get create a named regtest wallet", async () => {
    const req = {
      network: "regtest",
      name: "test",
    };
    let w = await createWallet(req);
    expect(w.cashaddr).toMatch(/bchreg:/);
    expect(w.name).toBe("test");
  });
  test("Get create a named regtest seed wallet", async () => {
    const req = {
      name: "Bob's Regtest Wallet",
      type: "seed",
      network: "regtest",
    } as WalletRequestI;
    let w = await createWallet(req);
    expect(w.cashaddr).toMatch(/bchreg:/);
    expect(w.name).toBe("Bob's Regtest Wallet");
  });

  test("Get create a unnamed mainnet wallet", async () => {
    const req = {
      type: "seed",
      network: "mainnet",
    } as WalletRequestI;
    let w = await createWallet(req);
    expect(w.cashaddr).toMatch(/bitcoincash:q/);
    expect(w.walletType).toBe("seed");
  });
  test("Get create a mainnet wif wallet", async () => {
    const req = {
      type: "wif",
      network: "mainnet",
    } as WalletRequestI;
    let w = await createWallet(req);
    expect(w.cashaddr).toMatch(/bitcoincash:q/);
    expect(w.walletType).toBe("wif");
  });
});
