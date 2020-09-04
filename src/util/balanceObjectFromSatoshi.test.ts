import { balanceResponseFromSatoshi } from "./balanceObjectFromSatoshi";

test("Get a testnet wallet from string id", async () => {
  let bal = balanceResponseFromSatoshi(10e8);
  expect(bal.bch).toBe(1);
  expect(bal.sat).toBe(10e8);
});
