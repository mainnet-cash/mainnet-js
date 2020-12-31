import { getPlatform } from "./getPlatform";

test("Should return the prefix", async () => {
  expect(getPlatform()).toBe("node");
});
