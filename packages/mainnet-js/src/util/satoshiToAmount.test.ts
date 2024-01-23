import { satoshiToAmount } from "./satoshiToAmount";

test("get a zero satoshis", async () => {
  let zero = await satoshiToAmount(0, "sat");
  expect(zero).toBe(0);
});
