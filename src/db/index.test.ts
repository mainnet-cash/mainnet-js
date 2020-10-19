
import { RegTestWallet } from "../wallet/Wif";

beforeEach(() => {
  
});

/**
 * @jest-environment jsdom
 */
test("Store and retrieve a Regtest wallet", async () => {
  
  let w1 = await RegTestWallet.named("Regtest Wallet 1");
  let w2 = await RegTestWallet.named("Regtest Wallet 2");
  let w1Again = await RegTestWallet.named("Regtest Wallet 1");
  let w2Again = await RegTestWallet.named("Regtest Wallet 2");
  
  
  expect(w1.name.startsWith("Regtest Wallet")).toBeTruthy();
  expect(w1.getSerializedWallet().startsWith("wif:regtest:c")).toBeTruthy();

  expect(w2.name.startsWith("Regtest Wallet")).toBeTruthy();
  expect(w2.getSerializedWallet().startsWith("wif:regtest:c")).toBeTruthy();
  expect(w1.name).toBe(w1Again.name);
  expect(w1.getSerializedWallet()).toBe(w1Again.getSerializedWallet());
  expect(w2.getSerializedWallet()).toBe(w2Again.getSerializedWallet());

});
