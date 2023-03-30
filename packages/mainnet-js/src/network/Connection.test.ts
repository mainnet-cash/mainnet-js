import { initProviders, disconnectProviders, Connection } from "./Connection";
import { RegTestWallet, TestNetWallet, Wallet } from "../wallet/Wif";

beforeAll(async () => {
  await initProviders();
});

afterAll(async () => {
  await disconnectProviders();
});

test("Should connect to mainnet", async () => {
  process.setMaxListeners(0);

  let wallet = await Wallet.newRandom();
  expect(wallet.provider == globalThis.BCH).toBeTruthy();
  expect(await wallet.getBalance("sat")).toBe(0);

  let height = await globalThis.BCH.getBlockHeight();
  expect(height).toBeGreaterThan(5000);
});

test("Should use global provider when creating testnet wallet", async () => {
  let wallet = await TestNetWallet.newRandom();
  expect(wallet.provider == globalThis.tBCH).toBeTruthy();
  expect(await wallet.getBalance("sat")).toBe(0);

  let height = await globalThis.tBCH.getBlockHeight();
  expect(height).toBeGreaterThan(114);
});

test.skip("Should lower overhead in creating wallets", async () => {
  process.setMaxListeners(0);
  for (let i = 0; i < 100; i++) {
    let wallet = await RegTestWallet.newRandom();
    expect(wallet.provider == globalThis.rBCH).toBeTruthy();
    expect(await wallet.getBalance("sat")).toBe(0);
  }

  let height = await globalThis.rBCH.getBlockHeight();
  expect(height).toBeGreaterThan(114);
});

test("Should create a new Connection", async () => {
  let conn = new Connection("mainnet", "wss://bch.imaginary.cash:50004");
  await conn.ready();
  expect(conn.networkProvider == globalThis.BCH).toBeFalsy();
  let blockheight = await conn.networkProvider.getBlockHeight();
  expect(blockheight).toBeGreaterThan(10000);
  expect(10001).toBeGreaterThan(10000);
});
