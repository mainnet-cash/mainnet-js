import { RegTestWallet, TestNetWallet, Wallet } from "../wallet/Wif";

/**
 * @jest-environment jsdom
 */
test("Store and retrieve a Regtest wallet", async () => {
  let w1 = await RegTestWallet.named("Basic Regtest");
  expect(w1.name).toBe("Basic Regtest");
  expect(w1.network).toBe("regtest");
  expect(w1.walletType).toBe("seed");
  expect(w1.toString()).toBe("named:regtest:Basic Regtest");
  expect(w1.toDbString()).toMatch(/seed:regtest:(\w+\s){11}\w+/);
  let w1Again = await RegTestWallet.named("Basic Regtest");

  expect(w1.name).toBe(w1Again.name);
  expect(w1.network).toBe(w1Again.network);
  expect(w1.cashaddr).toBe(w1Again.cashaddr);
  expect(w1.privateKeyWif).toBe(w1Again.privateKeyWif);
  expect(w1.toString()).toBe(w1Again.toString());
});

test("Store and retrieve a TestNet wallet", async () => {
  let w1 = await TestNetWallet.named("Basic Testnet Wallet", "db-test");
  expect(w1.name).toBe("Basic Testnet Wallet");
  expect(w1.network).toBe("testnet");
  expect(w1.walletType).toBe("seed");
  expect(w1.toDbString()).toMatch(/seed:testnet:(\w+\s){11}\w+/);
  expect(w1.toString()).toBe("named:testnet:Basic Testnet Wallet");
  let w1Again = await TestNetWallet.named("Basic Testnet Wallet", "db-test");

  expect(w1.name).toBe(w1Again.name);
  expect(w1.network).toBe(w1Again.network);
  expect(w1.cashaddr).toBe(w1Again.cashaddr);
  expect(w1.privateKeyWif).toBe(w1Again.privateKeyWif);
  expect(w1.toString()).toBe(w1Again.toString());
});

test("Store and retrieve a seed wallet", async () => {
  let w1 = await Wallet.named("Seed Wallet", "db-test");
  expect(w1.name).toBe("Seed Wallet");
  expect(w1.network).toBe("mainnet");
  expect(w1.walletType).toBe("seed");
  expect(w1.toDbString()).toMatch(/seed:mainnet:(\w+\s){11}\w+/);
  expect(w1.toString()).toBe("named:mainnet:Seed Wallet");
  let w1Again = await Wallet.named("Seed Wallet", "db-test");

  expect(w1.name).toBe(w1Again.name);
  expect(w1.network).toBe(w1Again.network);
  expect(w1.cashaddr).toBe(w1Again.cashaddr);
  expect(w1.privateKeyWif).toBe(w1Again.privateKeyWif);
  expect(w1.toString()).toBe(w1Again.toString());
});

test("Expect Error passing mainnet wallet to error", async () => {
  expect.assertions(1);
  try {
    process.env.ALLOW_MAINNET_USER_WALLETS = "false";
    await Wallet.named("Seed Wallet", "db-test");
  } catch (e: any) {
    expect(e.message).toBe(
      'Refusing to save wallet in an open public database, remove ALLOW_MAINNET_USER_WALLETS="false", if this service is secure and private'
    );
  }
});
