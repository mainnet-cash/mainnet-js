import { default as IndexedDBProvider } from "./IndexedDBProvider";
import { RegTestWallet, TestNetWallet, Wallet } from "../wallet/Wif";

/**
 * @jest-environment jsdom
 */
test("Store and retrieve a Regtest wallet", async () => {
    let db = new IndexedDBProvider("regtest");
    await db.init();
    let w1 = await RegTestWallet.newRandom("dave", "regtest-db");
    await db.addWallet(w1.name, w1.getSerializedWallet());
    let w2 = await db.getWallet("dave");
    expect(w1.name).toBe(w2!.name);
    expect(w1.getSerializedWallet()).toBe(w2!.wallet);
    db.close();
});

test("Store and retrieve a Testnet wallet", async () => {
    let db = new IndexedDBProvider("testnet");
    await db.init();
    let w1 = await TestNetWallet.newRandom("dave", "testnet-db");
    await db.addWallet(w1.name, w1.getSerializedWallet());
    let w2 = await db.getWallet("dave");
    expect(w1.name).toBe(w2!.name);
    expect(w1.getSerializedWallet()).toBe(w2!.wallet);
    db.close();
});

test("Store and retrieve a Mainnet wallet", async () => {
    let db = new IndexedDBProvider("mainnet");
    await db.init();
    let w1 = await Wallet.newRandom("dave", "mainnet-db");
    await db.addWallet(w1.name, w1.getSerializedWallet());
    let w2 = await db.getWallet(w1.name);
    expect(w1.name).toBe(w2!.name);
    expect(w1.getSerializedWallet()).toBe(w2!.wallet);
    db.close();
});
