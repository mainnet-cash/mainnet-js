import { satoshiToAmount } from "./satoshiToAmount.js";

test("get a zero satoshis", async () => {
  let zero = await satoshiToAmount(0n, "sat");
  expect(zero).toBe(0);
});
