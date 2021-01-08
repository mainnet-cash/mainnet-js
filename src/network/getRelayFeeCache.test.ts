import { getRelayFeeCache } from "./getRelayFeeCache";
import { getNetworkProvider } from "./default";

test("Should return  ", async () => {
  let provider = getNetworkProvider();
  let fee = await getRelayFeeCache(provider);
  expect(fee).toBe(1);
});

test("Should return  ", async () => {
  let provider = getNetworkProvider();
  globalThis.BCH_RELAY_FEE = 0.00005;
  let fee2 = await getRelayFeeCache(provider);
  expect(fee2).toBe(5);
});
