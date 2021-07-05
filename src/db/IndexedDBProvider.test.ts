import { default as IndexedDBProvider } from "./IndexedDBProvider";
import { RegTestWallet, TestNetWallet, Wallet } from "../wallet/Wif";

/**
 * @jest-environment jsdom
 */
test("Store and retrieve a Regtest wallet", async () => {
  let db = new IndexedDBProvider("regtest-db");
  await db.init();
  let w1 = await RegTestWallet.newRandom();
  w1.name = "dave";
  await db.addWallet(w1.name, w1.toString());
  let w2 = await db.getWallet("dave");
  expect(w1.name).toBe(w2!.name);
  expect(w1.toString()).toBe(w2!.wallet);
  db.close();
});

test("Store and replace a Regtest wallet", async () => {
  const dbPrefix = `regtest2 ${Math.random()}`;
  let db = new IndexedDBProvider(dbPrefix);
  await db.init();

  expect(await db.walletExists("storereplace")).toBe(false);
  let w1 = await db.addWallet("storereplace", "keep seed");
  let w2 = await db.getWallet("storereplace");
  expect("keep seed").toBe(w2!.wallet);
  expect(await db.walletExists("storereplace")).toBe(true);

  let seedId = (
    await RegTestWallet.fromSeed(new Array(12).join("abandon "))
  ).toDbString();
  let w3 = await db.updateWallet("storereplace", seedId);
  let w4 = await db.getWallet("storereplace");
  expect(w4!.wallet).not.toBe("keep seed");
  expect(w4!.wallet).toBe(seedId);

  let w5 = await db.updateWallet("storereplace_nonexistent", seedId);
  let w6 = await db.getWallet("storereplace_nonexistent")!;
  expect(w6).toBe(undefined);

  db.close();
});

test("Store and retrieve a Testnet wallet", async () => {
  let db = new IndexedDBProvider("testnet-db");
  await db.init();
  // passing a name to newRandom should save the wallet,
  // but we want to save it manually in this case
  let w1 = await TestNetWallet.newRandom();
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
  let w1 = await Wallet.newRandom();
  w1.name = "dave";
  await db.addWallet(w1.name, w1.toString());
  let w2 = await db.getWallet(w1.name);
  expect(w1.name).toBe(w2!.name);
  expect(w1.toString()).toBe(w2!.wallet);
  db.close();
});
