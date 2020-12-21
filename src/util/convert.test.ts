import { convert } from "./convert";
import { getUsdRate } from "./getUsdRate";

test("Get price sat in usd", async () => {
  let rate = await getUsdRate();
  let usd = await convert(100000000, "sat", "usd");
  expect(Math.round(rate)).toBeLessThan(usd + 1);
  expect(Math.round(rate)).toBeGreaterThan(usd - 1);
});

test("Get of bch in usd", async () => {
  let rate = await getUsdRate();
  let usd = await convert(1, "bch", "usd");
  expect(Math.round(rate)).toBeLessThan(usd + 1);
  expect(Math.round(rate)).toBeGreaterThan(usd - 1);
});

test("Should usd value in fixed format", async () => {
  let usd = await convert(1, "bch", "usd");
  expect(usd.toString()).toMatch(/^\d+\.\d{2}$/);
});

test("Get price in usd in bch", async () => {
  let rate = await getUsdRate();
  let unity = await convert(rate, "usd", "bch");
  expect(unity).toBeLessThan(1.01);
  expect(unity).toBeGreaterThan(0.99);
});

test("Should convert in full loop", async () => {
  let usd = await convert(1, "bch", "usd");
  let sat = await convert(usd, "USD", "sat");
  let bch = await convert(sat, "sat", "BCH");
  expect(bch).toBeLessThan(1.01);
  expect(bch).toBeGreaterThan(0.99);
});

test("Should convert all the BCH from sat to bch", async () => {
  let bch = await convert(21000000 * 100000000, "sat", "BCH");
  expect(bch).toBe(21000000);
});
