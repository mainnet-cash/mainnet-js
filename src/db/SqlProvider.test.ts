import { default as SqlProvider } from "./SqlProvider";
import { RegTestWallet, TestNetWallet, Wallet } from "../wallet/Wif";

/**
 * @jest-environment jsdom
 */
test("Store and retrieve a Regtest wallet", async () => {
  let db = new SqlProvider("regtest2");
  await db.init();
  let w1 = await RegTestWallet.newRandom();
  w1.name = "dave";
  await db.addWallet(w1.name, w1.toString());
  let w2 = await db.getWallet("dave");
  expect(w1.name).toBe(w2!.name);
  expect(w1.toString()).toBe(w2!.wallet);
  db.close();
});

test("Store and retrieve a Testnet wallet", async () => {
  let db = new SqlProvider("testnet");
  await db.init();
  let w1 = await TestNetWallet.newRandom();
  w1.name = "dave";
  await db.addWallet(w1.name, w1.toString());
  let w2 = await db.getWallet(w1.name);
  expect(w1.name).toBe(w2!.name);
  expect(w1.toString()).toBe(w2!.wallet);
  db.close();
});

test("Store and retrieve a Wif wallet", async () => {
  let db = new SqlProvider("mainnet");
  await db.init();
  let w1 = await Wallet.newRandom();
  w1.name = "dave";
  await db.addWallet(w1.name, w1.toString());
  let w2 = await db.getWallet(w1.name);
  expect(w1.name).toBe(w2!.name);
  expect(w1.toString()).toBe(w2!.wallet);
  db.close();
});

test("Should handle basic sql injection", async () => {
  let sh = new SqlProvider("still_here");
  await sh.init();
  let w1 = await Wallet.newRandom();
  await sh.addWallet("okay", w1.toString());

  let db = new SqlProvider(";DELETE table still_here");
  await db.init();
  let alice = await RegTestWallet.newRandom();
  let bob = await RegTestWallet.newRandom();
  let charlie = await RegTestWallet.newRandom();
  await db.addWallet("alice", alice.toString());
  await db.addWallet("bob", bob.toString());
  await db.addWallet("charlie", charlie.toString());
  let beforeWallets = await db.getWallets();
  expect(beforeWallets.length).toBe(3);
  let dave = await RegTestWallet.newRandom();
  await db.addWallet("; DELETE * FROM wallet limit 10;", dave.toString());
  await db.addWallet(
    "' or 1=1; DELETE * FROM wallet limit 10;",
    dave.toString()
  );
  await db.addWallet(
    "; DELETE FROM wallet WHERE GUID ='' OR '' = '';",
    dave.toString()
  );
  await db.addWallet("' or 1=1; TRUNCATE wallet;", dave.toString());
  await db.addWallet("' or 1=1; DROP table Wallet;", dave.toString());
  let wallets = await db.getWallets();
  expect(wallets.length).toBe(8);
  let otherTableWallets = await sh.getWallets();
  expect(otherTableWallets.length).toBe(1);
  db.close();
  sh.close();
});

// test("Store and retrieve a webhook", async () => {
//   let db = new SqlProvider("testnet");
//   await db.init();
//   await db.addWebHook("transaction:in:123123123", "https://mysite.com/api/webhook");
//   let webHook = await db.getWebHook("transaction:in:123123123");
//   expect(webHook!.tx_id).toBe("transaction:in:123123123");
//   expect(webHook!.hook_url).toBe("https://mysite.com/api/webhook");
//   expect(new Date() >= webHook!.expires_at);

//   let allHooks = await db.getWebHooks();
//   expect(allHooks.length == 1);

//   db.close();
// });
