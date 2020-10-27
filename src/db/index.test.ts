import { RegTestWifWallet, TestNetWifWallet, WifWallet } from "../wallet/Wif";

/**
 * @jest-environment jsdom
 */
test("Store and retrieve a Regtest wallet", async () => {
  let w1 = (await RegTestWifWallet.named(
    "Basic Regtest",
    "db-test"
  )) as RegTestWifWallet;
  expect(w1.name).toBe("Basic Regtest");
  expect(w1.network).toBe("regtest");
  expect(w1.walletType).toBe("wif");
  expect(w1.toString().slice(0, 13)).toBe("wif:regtest:c");
  let w1Again = (await RegTestWifWallet.named(
    "Basic Regtest",
    "db-test"
  )) as RegTestWifWallet;

  expect(w1.name).toBe(w1Again.name);
  expect(w1.network).toBe(w1Again.network);
  expect(w1.cashaddr).toBe(w1Again.cashaddr);
  expect(w1.privateKeyWif).toBe(w1Again.privateKeyWif);
  expect(w1.toString()).toBe(w1Again.toString());
});

test("Store and retrieve a TestNet wallet", async () => {
  let w1 = (await TestNetWifWallet.named(
    "Basic Testnet Wallet",
    "db-test"
  )) as TestNetWifWallet;
  expect(w1.name).toBe("Basic Testnet Wallet");
  expect(w1.network).toBe("testnet");
  expect(w1.walletType).toBe("wif");
  expect(w1.toString().slice(0, 13)).toBe("wif:testnet:c");
  let w1Again = (await TestNetWifWallet.named(
    "Basic Testnet Wallet",
    "db-test"
  )) as TestNetWifWallet;

  expect(w1.name).toBe(w1Again.name);
  expect(w1.network).toBe(w1Again.network);
  expect(w1.cashaddr).toBe(w1Again.cashaddr);
  expect(w1.privateKeyWif).toBe(w1Again.privateKeyWif);
  expect(w1.toString()).toBe(w1Again.toString());
});


test("Store and retrieve a wif wallet", async () => {
  let w1 = (await WifWallet.named("Wif Wallet", "db-test")) as WifWallet;
  expect(w1.name).toBe("Wif Wallet");
  expect(w1.network).toBe("mainnet");
  expect(w1.walletType).toBe("wif");
  expect(w1.toString().slice(0, 12)).toBe("wif:mainnet:");
  let w1Again = (await WifWallet.named("Wif Wallet", "db-test")) as WifWallet;

  expect(w1.name).toBe(w1Again.name);
  expect(w1.network).toBe(w1Again.network);
  expect(w1.cashaddr).toBe(w1Again.cashaddr);
  expect(w1.privateKeyWif).toBe(w1Again.privateKeyWif);
  expect(w1.toString()).toBe(w1Again.toString());
});

test("Expect Error passing mainnet wallet to error", async () => {
  expect.assertions(1);
  try {
    process.env.ALLOW_MAINNET_USER_WALLETS="false"
    await WifWallet.named("Wif Wallet", "db-test");
  } catch (e) {
    expect(e.message).toBe(
      "Refusing to save wallet in an open public database, remove ALLOW_MAINNET_USER_WALLETS=\"false\", if this service is secure and private"
    );
  }
});
