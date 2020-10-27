import { default as IndexedDBProvider } from "./IndexedDBProvider";
import { RegTestWifWallet, TestNetWifWallet, WifWallet } from "../wallet/Wif";

/**
 * @jest-environment jsdom
 */
test("Store and retrieve a Regtest wallet", async () => {
  let db = new IndexedDBProvider("regtest-db");
  await db.init();
  let w1 = await RegTestWifWallet.newRandom();
  w1.name = "dave";
  await db.addWallet(w1.name, w1.toString());
  let w2 = await db.getWallet("dave");
  expect(w1.name).toBe(w2!.name);
  expect(w1.toString()).toBe(w2!.wallet);
  db.close();
});

test("Store and retrieve a Testnet wallet", async () => {
  let db = new IndexedDBProvider("testnet-db");
  await db.init();
  // passing a name to newRandom should save the wallet,
  // but we want to save it manually in this case
  let w1 = await TestNetWifWallet.newRandom();
  w1.name = "dave";
  await db.addWallet(w1.name, w1.toString());
  let w2 = await db.getWallet("dave");
  expect(w1.name).toBe(w2!.name);
  expect(w1.toString()).toBe(w2!.wallet);
  db.close();
});

test("Store and retrieve a Mainnet wallet", async () => {
  let db = new IndexedDBProvider("mainnet-db");
  await db.init();
  let w1 = await WifWallet.newRandom();
  w1.name = "dave";
  await db.addWallet(w1.name, w1.toString());
  let w2 = await db.getWallet(w1.name);
  expect(w1.name).toBe(w2!.name);
  expect(w1.toString()).toBe(w2!.wallet);
  db.close();
});
