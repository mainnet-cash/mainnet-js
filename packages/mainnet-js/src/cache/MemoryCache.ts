let cache: Record<string, string> = {};
export class MemoryCache {
  async init() {
    return;
  }
  async setItem(key: string, value: string) {
    cache[key] = value;
  }
  async getItem(key: string) {
    return cache[key] ?? null;
  }
  async removeItem(key: string) {
    delete cache[key];
  }
  async clear() {
    cache = {};
  }
}
