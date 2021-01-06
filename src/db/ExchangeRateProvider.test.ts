import { default as ExchangeRateProvider } from "./ExchangeRateProvider";

test("Store and retrieve an exchange rate", async () => {
  let db = new ExchangeRateProvider();
  await db.init();
  let rate = 451.0;
  await db.setRate("usd", rate, Date.now());
  let fx1 = await db.getRate("usd");
  expect(fx1).toBeDefined();
  expect(fx1!.symbol).toBe("usd");
  expect(fx1!.rate).toBe(rate);
  let rate2 = 450.1;
  await db.setRate("usd", rate2, Date.now());
  let fx2 = await db.getRate("usd");
  expect(fx2).toBeDefined();
  expect(fx2!.symbol).toBe("usd");
  expect(fx2!.rate).toBe(rate2);
  await db.close();
});
