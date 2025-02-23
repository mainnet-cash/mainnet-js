import { WebStorageCache } from "./WebStorageCache";

describe("WebStorageCache Tests", () => {
  test("test", async () => {
    const cache = new WebStorageCache();
    await cache.init();
    await cache.setItem("key", "value");
    const value = await cache.getItem("key");
    expect(value).toBe("value");

    await cache.removeItem("key");
    const value2 = await cache.getItem("key");
    expect(value2).toBeNull();
  });
});
