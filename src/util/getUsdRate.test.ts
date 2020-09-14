import { getUsdRate } from "./getUsdRate";

test("Get price in usd", async () => {
  let rate = await getUsdRate();
  expect(rate).toBeGreaterThan(75.0);
});
