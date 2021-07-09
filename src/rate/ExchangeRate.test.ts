import { ExchangeRate } from "./ExchangeRate";

test("Get price in usd", async () => {
  ExchangeRate.setupAxiosMock("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=usd", { 'bitcoin-cash': { usd: 666.666 } });
  ExchangeRate.setupAxiosMock("https://markets.api.bitcoin.com/live/bitcoin",  { BCH: 666.666 });

  let rate = await ExchangeRate.get("usd");
  expect(rate).toBe(666.666);
});
