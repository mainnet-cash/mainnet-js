import { ExchangeRate } from "./ExchangeRate.js";

describe("ExchangeRate in browser", () => {
  test("Should get exchange rate in usd", async () => {
    const rate = await ExchangeRate.get("usd");
    expect(rate).toBeGreaterThan(0);
  });
});
