import { getWeakRandomInt } from "./randomInt";

test("get a random int", async () => {
  let zero = await getWeakRandomInt(0);
  expect(zero).toBe(0);
});

test("average some random ints", async () => {
  let average = 0;
  for (let i = 0; i < 100; i++) {
    average += getWeakRandomInt(1000) / 100;
  }
  expect(average).toBeGreaterThan(400);
  expect(average).toBeLessThan(600);
});
