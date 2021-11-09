import { floor } from "./floor";

test("Should return a number floored to 2 precision", async () => {
  let result = floor(5.019, 2).toString();
  expect(result).toStrictEqual("5.01");
});

test("Should return a number floored to 3 precision", async () => {
  let result = floor(5.0199, 3).toString();
  expect(result).toStrictEqual("5.019");
});

test("Should return a number floored to 2 precision", async () => {
  let result = floor(5.0200001, 2).toString();
  expect(result).toStrictEqual("5.02");
});

test("Should return a number floored to 0 precision", async () => {
  let result = floor(5.996, 0).toString();
  expect(result).toStrictEqual("5");
});
