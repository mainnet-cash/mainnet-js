import { default as SqlProvider } from "./SqlProvider";
import { RegTestWallet, TestNetWallet, Wallet } from "../wallet/Wif";


/**
 * @jest-environment jsdom
 */
test("Store and retrieve a Regtest wallet", async () => {
  let db = new SqlProvider("regtest");
  await db.init();
  let w1 = await RegTestWallet.newRandom();
  w1.name = "dave";
  await db.addWallet(w1.name, w1.getSerializedWallet());
  let w2 = await db.getWallet(w1.name);
  expect(w1.name).toBe(w2!.name);
  expect(w1.getSerializedWallet()).toBe(w2!.wallet);
  db.close();
});

test("Store and retrieve a Testnet wallet", async () => {
    let db = new SqlProvider("testnet");
    await db.init();
    let w1 = await TestNetWallet.newRandom();
    w1.name = "dave";
    await db.addWallet(w1.name, w1.getSerializedWallet());
    let w2 = await db.getWallet(w1.name);
    expect(w1.name).toBe(w2!.name);
    expect(w1.getSerializedWallet()).toBe(w2!.wallet);
    db.close();
  });

test("Should handle basic sql injection", async () => {
    let sh = new SqlProvider("still_here");
    await sh.init();
    let w1 = await Wallet.newRandom();
    await sh.addWallet("okay", w1.getSerializedWallet());
    

    let db = new SqlProvider(";DELETE table still_here");
    await db.init();
    let alice = await RegTestWallet.newRandom();
    let bob = await RegTestWallet.newRandom();
    let charlie = await RegTestWallet.newRandom();
    await db.addWallet("alice", alice.getSerializedWallet());
    await db.addWallet("bob", bob.getSerializedWallet());
    await db.addWallet("charlie", charlie.getSerializedWallet());
    let beforeWallets = await db.getWallets();
    expect(beforeWallets.length).toBe(3);
    let dave = await RegTestWallet.newRandom();
    await db.addWallet("; DELETE * FROM wallet limit 10;", dave.getSerializedWallet());
    await db.addWallet("' or 1=1; DELETE * FROM wallet limit 10;", dave.getSerializedWallet());
    await db.addWallet("; DELETE FROM wallet WHERE GUID ='' OR '' = '';", dave.getSerializedWallet());
    await db.addWallet("' or 1=1; TRUNCATE wallet;", dave.getSerializedWallet());
    await db.addWallet("' or 1=1; DROP table Wallet;", dave.getSerializedWallet());
    let wallets = await db.getWallets();
    expect(wallets.length).toBe(8);
    let otherTableWallets = await sh.getWallets();
    expect(otherTableWallets.length).toBe(1);
    db.close()
    sh.close()

  });
