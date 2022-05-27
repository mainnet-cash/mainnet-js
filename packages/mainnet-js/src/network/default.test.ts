import { getNetworkProvider } from "./default";
import { initProviders, disconnectProviders } from "./Connection";

beforeAll(async () => {
  await initProviders();
});

afterAll(async () => {
  await disconnectProviders();
});

test("Should connect to the default cluster", async () => {
  let provider = getNetworkProvider();

  expect(provider.network).toBe("mainnet");
  const bal = await provider.getBalance(
    "qp6e6enhpy0fwwu7nkvlr8rgl06ru0c9lywalz8st5"
  );
  expect(bal).toBeGreaterThan(1313545598);
});

test("Should connect to the default testnet cluster", async () => {
  let provider = getNetworkProvider("testnet");

  expect(provider.network).toBe("testnet");
  const bal = await provider.getBalance(process.env.ALICE_TESTNET_ADDRESS!);
  expect(bal).toBeGreaterThan(100);
});

// TODO: Fix timeout issue
// test("Should connect to the default regtest client", async () => {
//   let provider = getNetworkProvider("regtest");

//   expect(provider.network).toBe("regtest");
//   const bal = await provider.getBalance(process.env.ADDRESS!);
//   expect(bal).toBeGreaterThan(0);
// });
