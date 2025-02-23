import { IndexedDbCache } from "./IndexedDbCache";

describe("IndexedDbCache Tests", () => {
  test("test", async () => {
    const cache = new IndexedDbCache();
    await cache.init();
    await cache.setItem("key", "value");
    const value = await cache.getItem("key");
    expect(value).toBe("value");

    await cache.removeItem("key");
    const value2 = await cache.getItem("key");
    expect(value2).toBeNull();
  });
});
