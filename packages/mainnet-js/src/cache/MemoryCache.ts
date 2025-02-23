export class MemoryCache {
  public cache: Record<string, string> = {};
  async init() {
    return;
  }
  async setItem(key: string, value: string) {
    this.cache[key] = value;
  }
  async getItem(key: string) {
    return this.cache[key] ?? null;
  }
  async removeItem(key: string) {
    delete this.cache[key];
  }
  async clear() {
    this.cache = {};
  }
}
