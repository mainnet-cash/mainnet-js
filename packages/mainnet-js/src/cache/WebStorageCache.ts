import { CacheProvider } from "./interface";

// super thin wrapper around localStorage
export class WebStorageCache implements CacheProvider {
  async init() {
    return;
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async getItems(keys: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    for (const key of keys) {
      results.set(key, localStorage.getItem(key));
    }
    return results;
  }

  async setItems(entries: [string, string][]): Promise<void> {
    for (const [key, value] of entries) {
      localStorage.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }
}
