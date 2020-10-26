import { getRandomInt } from "./randomInt";

test("get a random int", async () => {
  let zero = await getRandomInt(0);
  expect(zero).toBe(0);
});

test("average some random ints", async () => {
  let average = 0;
  for (let i = 0; i < 100; i++) {
    average += getRandomInt(1000) / 100;
  }
  expect(average).toBeGreaterThan(400);
  expect(average).toBeLessThan(600);
});
