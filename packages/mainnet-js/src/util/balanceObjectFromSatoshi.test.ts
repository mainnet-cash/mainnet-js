import { Config } from "../config";
import { bchParam } from "../chain";
import { balanceResponseFromSatoshi } from "./balanceObjectFromSatoshi";
import { balanceFromSatoshi } from "./balanceObjectFromSatoshi";

test("Get balanceResponse from 1 bch in satoshi", async () => {
  let bal = await balanceResponseFromSatoshi(100000000n);
  expect(bal.bch).toBe(1);
  expect(bal.sat).toBe(bchParam.subUnits);
});

test("Get balanceResponse from 0", async () => {
  let bal = await balanceResponseFromSatoshi(0n);
  expect(bal.bch).toBe(0);
  expect(bal.sat).toBe(0n);
  expect(bal.usd).toBe(0);
});

test("Get balanceResponse from 1 bch in eur", async () => {
  Config.DefaultCurrency = "eur";
  let bal = await balanceResponseFromSatoshi(100000000n);
  expect(bal.bch).toBe(1);
  expect(bal.sat).toBe(bchParam.subUnits);
  expect(bal.eur).toBeGreaterThan(0);
  Config.DefaultCurrency = "usd";
});

test("Get balanceResponse from 1 satoshi", async () => {
  let bal = await balanceResponseFromSatoshi(110000000n);
  expect(bal.bch).toBe(1.1);
  expect(bal.sat).toBe(110000000n);
  expect(bal.usd!.toString()).toMatch(/\d+\.?\d{1,2}/);
});

test("Get balanceResponse from 1 sat", async () => {
  let val = await balanceFromSatoshi(1n, "sat");
  expect(val).toBe(1n);
});

test("Get balanceResponse from 1 bch", async () => {
  let val = await balanceFromSatoshi(bchParam.subUnits, "bch");
  expect(val).toBe(1);
});
