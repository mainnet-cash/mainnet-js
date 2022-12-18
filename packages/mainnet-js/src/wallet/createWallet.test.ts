import { createWallet, walletFromId } from "./createWallet";
import { WalletRequestI } from "./interface";
import { initProviders, disconnectProviders } from "../network/Connection";
import { delay } from "../util/delay";
import { WalletTypeEnum } from "./enum";

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe(`Named Wallets`, () => {
  test("Retrieve a named regtest wallet", async () => {
    const req = {
      network: "regtest",
      name: "test",
    };
    let w = await createWallet(req);
    expect(w.cashaddr).toMatch(/bchreg:/);
    expect(w.name).toBe("test");
    expect(w.toString()).toBe("named:regtest:test");

    // recover it from the id
    let w2 = await walletFromId(w.toString());
    expect(w2.getInfo()).toMatchObject(w.getInfo());
    expect(w2.name).toBe(w.name);

    let w3 = await createWallet(req);
    expect(w3.getInfo()).toMatchObject(w.getInfo());
    expect(w3.name).toBe(w.name);
  });

  test("Retrieve a named regtest wif wallet", async () => {
    const req = {
      network: "regtest",
      name: "test.wif",
      type: WalletTypeEnum.Wif,
    };
    let w = await createWallet(req);
    expect(w.cashaddr).toMatch(/bchreg:/);
    expect(w.name).toBe("test.wif");
    expect(w.toString()).toBe("named:regtest:test.wif");

    // recover it from id
    let w2 = await walletFromId(w.toString());
    expect(w2.getInfo()).toMatchObject(w.getInfo());
    expect(w2.name).toBe(w.name);
  });

  test("Get create an unnamed regtest seed wallet", async () => {
    const req = { network: "regtest" } as WalletRequestI;
    let w = await createWallet(req);
    expect(w.cashaddr).toMatch(/bchreg:/);
    expect(w.walletType).toBe("seed");
  });

  test("Watch wallet from Id", async () => {
    const w = await walletFromId(
      "watch:testnet:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22"
    );
    expect(w.getInfo()).toStrictEqual({
      cashaddr: "bchtest:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22",
      tokenaddr: "bchtest:zppr9h7whx9pzucgqukhtlj8lvgvjlgr3gzzm4cx4e",
      derivationPath: undefined,
      isTestnet: true,
      name: "",
      network: "testnet",
      parentDerivationPath: undefined,
      parentXPubKey: undefined,
      privateKey: undefined,
      privateKeyWif: undefined,
      publicKey: undefined,
      publicKeyHash: "4232dfceb98a117308072d75fe47fb10c97d038a",
      seed: undefined,
      walletDbEntry:
        "watch:testnet:bchtest:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22",
      walletId:
        "watch:testnet:bchtest:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22",
    });
  });

  test("Get create a regtest wif wallet", async () => {
    const req = {
      network: "regtest",
      type: "wif",
      name: "wif2",
    } as WalletRequestI;
    let w = await createWallet(req);
    expect(w.cashaddr).toMatch(/bchreg:/);
    expect(w.walletType).toBe("wif");

    // recover it from the id
    let w2 = await walletFromId(w.toString());
    expect(w2.getInfo()).toMatchObject(w.getInfo());
    expect(w2.name).toBe(w.name);

    // recover it from the database
    const req2 = {
      network: "regtest",
      type: "wif",
      name: "wif2",
    } as WalletRequestI;
    let w3 = await createWallet(req2);
    expect(w3.getInfo()).toMatchObject(w.getInfo());
    expect(w3.name).toBe(w.name);
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

  test("Retrieve a mainnet wif wallet", async () => {
    const req = {
      name: "Bob's Testnet Wallet, Again",
      type: "wif",
      network: "testnet",
    } as WalletRequestI;
    let w = await createWallet(req);
    expect(w.cashaddr).toMatch(/bchtest:q/);
    expect(w.walletType).toBe("wif");
    delay(1000);
    let w2 = await walletFromId(w.toString());
    expect(w2.cashaddr).toBe(w.cashaddr);
    expect(w2.name).toBe(w.name);
  });
});
