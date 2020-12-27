import { getRelayFeeCache } from "./getRelayFeeCache";
import { getNetworkProvider } from "./default";

test("Should return  ", async () => {
  let provider = getNetworkProvider();
  let fee = await getRelayFeeCache(provider);
  expect(fee).toBe(1);
});
