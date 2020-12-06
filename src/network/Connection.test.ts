import { initProviders, disconnectProviders } from "./Connection";
import { RegTestWallet, TestNetWallet, Wallet } from "../wallet/Wif";

beforeAll(async () => {
  await initProviders();
});

afterAll(async () => {
  await disconnectProviders();
});

test("Should connect to mainnet", async () => {
  process.setMaxListeners(0);

  let height = await globalThis.BCH.getBlockHeight();
  expect(height).toBeGreaterThan(5000);
  let wallet = await Wallet.newRandom();
  expect(wallet.provider == globalThis.BCH).toBeTruthy();
  expect(await wallet.getBalance("sat")).toBe(0);
});

test("Should use global provider when creating standard wallet", async () => {
  let height = await globalThis.BCHt.getBlockHeight();
  expect(height).toBeGreaterThan(114);
  let wallet = await TestNetWallet.newRandom();
  expect(wallet.provider == globalThis.BCHt).toBeTruthy();
  expect(await wallet.getBalance("sat")).toBe(0);
});

test("Should lower overhead in creating wallets", async () => {
  process.setMaxListeners(0);
  let height = await globalThis.BCHr.getBlockHeight();
  expect(height).toBeGreaterThan(114);
  for (let i = 0; i < 1000; i++) {
    let wallet = await RegTestWallet.newRandom();
    expect(wallet.provider == globalThis.BCHr).toBeTruthy();
    expect(await wallet.getBalance("sat")).toBe(0);
  }
});
