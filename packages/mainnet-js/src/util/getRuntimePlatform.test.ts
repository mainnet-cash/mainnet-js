import { getRuntimePlatform } from "./getRuntimePlatform.js";

test("Should return the prefix", async () => {
  expect(getRuntimePlatform()).toBe("node");
});
