import { default as SqlProvider } from "./SqlProvider";
import { RegTestWallet, TestNetWallet, Wallet } from "../wallet/Wif";
import { WebhookRecurrence, WebhookType } from "../webhook";

/**
 * @jest-environment jsdom
 */
test("Store and retrieve a Regtest wallet", async () => {
  let db = new SqlProvider(`regtest2 ${Math.random()}`);
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
  let db = new SqlProvider(`regtest2 ${Math.random()}`);
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
  let db = new SqlProvider(`testnet ${Math.random()}`);
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
  let db = new SqlProvider(`mainnet ${Math.random()}`);
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
  let sh = new SqlProvider(`still_here ${Math.random()}`);
  await sh.init();
  let w1 = await Wallet.newRandom();
  await sh.addWallet("okay", w1.toString());

  let db = new SqlProvider(`;DELETE table still_here; ${Math.random()}`);
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

test("Should fail registering SLP webhook without tokenId", async () => {
  let db = new SqlProvider(`regtest ${Math.random()}`);
  await db.init();
  await expect(
    db.addWebhook({
      cashaddr: "",
      url: "https://example.com/fail",
      type: WebhookType.slpTransactionIn,
      recurrence: WebhookRecurrence.recurrent,
    })
  ).rejects.toThrow();

  db.close();
});
