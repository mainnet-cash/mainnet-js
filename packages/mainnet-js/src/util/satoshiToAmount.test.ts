import { satoshiToAmount } from "./satoshiToAmount";

test("get a random int", async () => {
  let zero = await satoshiToAmount(0, "sat");
  expect(zero).toBe(0);
});
