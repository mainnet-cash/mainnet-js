import { getRuntimePlatform } from "./getRuntimePlatform.js";

describe("getRuntimePlatform in browser", () => {
  test("Should recognize browser as platform", async () => {
    const result = getRuntimePlatform();
    expect(result).toBe("browser");
  });
});
