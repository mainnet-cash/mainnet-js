import { Connection, initProviders, disconnectProviders } from "./Connection";
import { RegTestWallet, TestNetWallet, Wallet } from "../wallet/Wif";

beforeAll(async () => {
  await initProviders()
});

afterAll(async () => {
  await disconnectProviders()
});

test("Should create a persistent network connection", async () => {
  process.setMaxListeners(0);
  
  let height = await globalThis.BCH.networkProvider.getBlockHeight();
  expect(height).toBeGreaterThan(5000);
  let wallet = await Wallet.newRandom();
  expect(wallet.provider==globalThis.BCH.networkProvider).toBeTruthy()
  expect(await wallet.getBalance("sat")).toBe(0);
  
});

// test("Should create a persistent network connection", async () => {
//   process.setMaxListeners(0);
//   let height = await globalThis.BCHt.networkProvider.getBlockHeight();
//   expect(height).toBeGreaterThan(114);
//   for(let i=0; i< 1000; i++){
//     let wallet = await TestNetWallet.newRandom();
//     expect(wallet.provider==globalThis.BCHt.networkProvider).toBeTruthy()
//     expect(await wallet.getBalance("sat")).toBe(0);
//   }
// });


test("Should create a persistent network connection", async () => {
  process.setMaxListeners(0);
  let height = await globalThis.BCHr.networkProvider.getBlockHeight();
  expect(height).toBeGreaterThan(114);
  for(let i=0; i< 1000; i++){
    let wallet = await RegTestWallet.newRandom();
    expect(wallet.provider==globalThis.BCHr.networkProvider).toBeTruthy()
    expect(await wallet.getBalance("sat")).toBe(0);
  }
});


