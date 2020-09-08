import { bch } from "../chain";
import { balanceResponseFromSatoshi } from "./balanceObjectFromSatoshi";

test("Get balanceResponse from 1 bch in satoshi", async () => {
  let bal = await balanceResponseFromSatoshi(100000000);
  expect(bal.bch).toBe(1);
  expect(bal.sat).toBe(bch.subUnits);
});

test("Get balanceResponse from 1 satoshi", async () => {
  let bal = await balanceResponseFromSatoshi(1);
  expect(bal.bch).toBe(0.00000001);
  expect(bal.sat).toBe(1);
});
