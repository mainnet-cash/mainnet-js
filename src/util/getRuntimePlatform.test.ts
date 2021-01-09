import { getRuntimePlatform } from "./getRuntimePlatform";

test("Should return the prefix", async () => {
  expect(getRuntimePlatform()).toBe("node");
});
