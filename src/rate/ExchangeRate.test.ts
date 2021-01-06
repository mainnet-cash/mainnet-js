import { ExchangeRate } from "./ExchangeRate";

test("Get price in usd", async () => {
  let rate = await ExchangeRate.get('usd');
  expect(rate).toBeGreaterThan(75.0);
});
