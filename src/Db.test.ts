import { WalletDatabase } from "./Db";
import { RegTestWallet } from "./Wallet";
import { Dexie } from "dexie";

beforeEach(() => {
  let db = new Dexie("username123");
  return db.delete();
});

test("Store and retrieve a Regtest wallet", async () => {
  const db = new WalletDatabase("username123");
  let w1 = new RegTestWallet("Regtest Wallet 1");
  let w2 = new RegTestWallet("Regtest Wallet 2");
  await w1.generateWif();
  await w2.generateWif();
  await db.addWallet({ name: w1.name, wallet: w1.getSerializedWallet() });
  await db.addWallet({ name: w2.name, wallet: w2.getSerializedWallet() });
  let storedWallets = await db.getWallets();
  let wallet = storedWallets.pop();
  expect(wallet?.name.startsWith("Regtest Wallet")).toBeTruthy();
  expect(wallet?.wallet.startsWith("wif:bchreg:3")).toBeTruthy();

  let walletB = storedWallets.pop();
  expect(walletB?.name.startsWith("Regtest Wallet")).toBeTruthy();
  expect(walletB?.wallet.startsWith("wif:bchreg:3")).toBeTruthy();
});
