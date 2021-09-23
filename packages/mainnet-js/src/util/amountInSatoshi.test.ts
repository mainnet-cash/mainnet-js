import { amountInSatoshi } from "./amountInSatoshi";
import { bchParam } from "../chain";
import { ExchangeRate } from "../rate/ExchangeRate";

test("Get price of Bch, BCH, bch in sat", async () => {
  let rate = await amountInSatoshi(1, "Bch");
  expect(rate).toBe(bchParam.subUnits);
  rate = await amountInSatoshi(1, "BCH");
  expect(rate).toBe(bchParam.subUnits);
  rate = await amountInSatoshi(1, "bch");
  expect(rate).toBe(bchParam.subUnits);
});

test("Get price of sat(s)", async () => {
  let rate = await amountInSatoshi(1, "sat");
  expect(rate).toBe(1);
  rate = await amountInSatoshi(1, "sats");
  expect(rate).toBe(1);
  rate = await amountInSatoshi(1, "Satoshi");
  expect(rate).toBe(1);
  rate = await amountInSatoshi(1, "SATOSHIS");
  expect(rate).toBe(1);
  rate = await amountInSatoshi(1, "satoshis");
  expect(rate).toBe(1);
});

test("Get price of USD, Usd, usd", async () => {
  let usdRate = await ExchangeRate.get("usd");
  let rate = await amountInSatoshi(usdRate - 10, "USD");
  expect(rate).toBeLessThan(bchParam.subUnits);
  rate = await amountInSatoshi(usdRate - 10, "Usd");
  expect(rate).toBeLessThan(bchParam.subUnits);
  rate = await amountInSatoshi(usdRate - 10, "usd");
  expect(rate).toBeLessThan(bchParam.subUnits);
});
