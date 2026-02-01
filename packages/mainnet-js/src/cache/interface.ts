export interface CacheProvider {
  init(): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  getItems(keys: string[]): Promise<Map<string, string | null>>;
  setItems(entries: [string, string][]): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
