import { CacheProvider } from "./interface";

export abstract class KeyValueCache implements CacheProvider {
  abstract init(): Promise<void>;
  abstract setItem(key: string, value: string): Promise<void>;
  abstract getItem(key: string): Promise<string | null>;
  abstract removeItem(key: string): Promise<void>;
  abstract clear(): Promise<void>;
}
