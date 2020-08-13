import { generateBlock } from "./generateBlock";

test("Generate a block on a Regression Network", () => {
  expect(generateBlock(1)[0].length).toBe(64);
});
