import { DBCoreRangeType } from "dexie";
import { default as SqlProvider } from "./SqlProvider";
import { RegTestWallet, TestNetWallet, Wallet } from "../wallet/Wif";
beforeEach(() => {});

/**
 * @jest-environment jsdom
 */
test("Store and retrieve a Regtest wallet", async () => {
  let db = new SqlProvider();
  await db.init();
  let w1 = await RegTestWallet.newRandom();
  w1.name = "dave";
  await db.addWallet(w1.name, w1.getSerializedWallet());
  let w2 = await db.getWallet(w1.name);
  expect(w1.name).toBe(w2!.name);
  expect(w1.getSerializedWallet()).toBe(w2!.getSerializedWallet());
  db.close();
});
