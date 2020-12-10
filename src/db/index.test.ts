import { RegTestWallet, TestNetWallet, Wallet } from "../wallet/Wif";

/**
 * @jest-environment jsdom
 */
test("Store and retrieve a Regtest wallet", async () => {
  let w1 = await RegTestWallet.named("Basic Regtest");
  expect(w1.name).toBe("Basic Regtest");
  expect(w1.network).toBe("regtest");
  expect(w1.walletType).toBe("wif");
  expect(w1.toString()).toBe("named:regtest:Basic Regtest");
  expect(w1.toDbString().slice(0, 13)).toBe("wif:regtest:c");
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
  expect(w1.walletType).toBe("wif");
  expect(w1.toDbString().slice(0, 13)).toBe("wif:testnet:c");
  expect(w1.toString()).toBe("named:testnet:Basic Testnet Wallet");
  let w1Again = await TestNetWallet.named("Basic Testnet Wallet", "db-test");

  expect(w1.name).toBe(w1Again.name);
  expect(w1.network).toBe(w1Again.network);
  expect(w1.cashaddr).toBe(w1Again.cashaddr);
  expect(w1.privateKeyWif).toBe(w1Again.privateKeyWif);
  expect(w1.toString()).toBe(w1Again.toString());
});

test("Store and retrieve a wif wallet", async () => {
  let w1 = await Wallet.named("Wif Wallet", "db-test");
  expect(w1.name).toBe("Wif Wallet");
  expect(w1.network).toBe("mainnet");
  expect(w1.walletType).toBe("wif");
  expect(w1.toDbString().slice(0, 12)).toBe("wif:mainnet:");
  expect(w1.toString()).toBe("named:mainnet:Wif Wallet");
  let w1Again = await Wallet.named("Wif Wallet", "db-test");

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
    await Wallet.named("Wif Wallet", "db-test");
  } catch (e) {
    expect(e.message).toBe(
      'Refusing to save wallet in an open public database, remove ALLOW_MAINNET_USER_WALLETS="false", if this service is secure and private'
    );
  }
});
