import { Connection } from "./Connection";
import { Wallet } from "../wallet/Wif";

test("Should create a persistent network connection", async () => {
  process.setMaxListeners(0);
  let bch = new Connection();
  await bch.ready();
  let height = await bch.networkProvider.getBlockHeight();
  expect(height).toBeGreaterThan(5000);
  let wallet = await bch.Wallet();
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  await bch.disconnect();
});

test("Should create a persistent network cluster connection", async () => {
  process.setMaxListeners(0);
  let bch = new Connection();
  await bch.ready();
  let height = await bch.networkProvider.getBlockHeight();
  expect(height).toBeGreaterThan(5000);
  let wallet = await bch.Wallet();
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  await bch.disconnect();
});

test("Should be this much slower without a persistent connection", async () => {
  let wallet = await Wallet.newRandom();
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
  expect(await wallet.getBalance("sat")).toBe(0);
});

test("Should create regtest wallet", async () => {
  process.setMaxListeners(0);
  let BCHr = new Connection("regtest");
  await BCHr.ready();
  expect(BCHr.network).toBe("regtest");
  let wallet = await BCHr.Wallet();
  expect(wallet.getDepositAddress()!.slice(0, 8)).toBe("bchreg:q");
  expect(await wallet.getBalance('sat')).toBe(0);
  expect(wallet.provider!.network).toBe("regtest");
  expect(wallet.network).toBe("regtest");
  await BCHr.disconnect();
});

test("Should create testnet wallet", async () => {
  process.setMaxListeners(0);
  let BCHt = new Connection("testnet");
  await BCHt.ready();
  expect(BCHt.network).toBe("testnet");
  let wallet = await BCHt.Wallet();
  expect(wallet.getDepositAddress()!.slice(0, 9)).toBe("bchtest:q");
  expect(await wallet.getBalance('sat')).toEqual(0);
  expect(wallet.provider!.network).toBe("testnet");
  expect(wallet.network).toBe("testnet");
  await BCHt.disconnect();
});
