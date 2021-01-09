import { bchParam } from "../chain";
import { balanceResponseFromSatoshi } from "./balanceObjectFromSatoshi";
import { balanceFromSatoshi } from "./balanceObjectFromSatoshi";

test("Get balanceResponse from 1 bch in satoshi", async () => {
  let bal = await balanceResponseFromSatoshi(100000000);
  expect(bal.bch).toBe(1);
  expect(bal.sat).toBe(bchParam.subUnits);
});

test("Get balanceResponse from 1 satoshi", async () => {
  let bal = await balanceResponseFromSatoshi(110000000);
  expect(bal.bch).toBe(1.1);
  expect(bal.sat).toBe(110000000);
  expect(bal.usd!.toString()).toMatch(/\d+\.?\d{1,2}/);
});

test("Get balanceResponse from 1 sat", async () => {
  let val = await balanceFromSatoshi(1, "sat");
  expect(val).toBe(1);
});

test("Get balanceResponse from 1 sats", async () => {
  let val = await balanceFromSatoshi(1, "sats");
  expect(val).toBe(1);
});

test("Get balanceResponse from 1 satoshi", async () => {
  let val = await balanceFromSatoshi(1, "satoshi");
  expect(val).toBe(1);
});

test("Get balanceResponse from 1 satoshis", async () => {
  let val = await balanceFromSatoshi(1, "satoshis");
  expect(val).toBe(1);
});

test("Get balanceResponse from 1 bch", async () => {
  let val = await balanceFromSatoshi(bchParam.subUnits, "bch");
  expect(val).toBe(1);
});
