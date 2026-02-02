import { CacheProvider } from "./interface";

let cache: Record<string, string> = {};
export class MemoryCache implements CacheProvider {
  async init() {
    return;
  }
  async setItem(key: string, value: string) {
    cache[key] = value;
  }
  async getItem(key: string) {
    return cache[key] ?? null;
  }
  async getItems(keys: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    for (const key of keys) {
      results.set(key, cache[key] ?? null);
    }
    return results;
  }
  async setItems(entries: [string, string][]): Promise<void> {
    for (const [key, value] of entries) {
      cache[key] = value;
    }
  }
  async removeItem(key: string) {
    delete cache[key];
  }
  async clear() {
    cache = {};
  }
}
