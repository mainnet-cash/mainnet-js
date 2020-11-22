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
  let bch = new Connection("mainnet", true);
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
  let regtestWallet = await BCHr.Wallet();
  expect(regtestWallet.getDepositAddress()!.slice(0, 8)).toBe("bchreg:q");
  expect(regtestWallet.provider!.network).toBe("regtest");
  await BCHr.disconnect();
});
