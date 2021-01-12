import { StorageProvider } from ".";
import { getRuntimePlatform } from "../util";
import { default as IndexedDBProvider } from "./IndexedDBProvider";
import { default as SqlProvider } from "./SqlProvider";

export function getStorageProvider(
  dbName: string
): StorageProvider | undefined {
  if (getRuntimePlatform() !== "node" && indexedDbIsAvailable()) {
    return new IndexedDBProvider(dbName);
  } else {
    if ("DATABASE_URL" in process.env) {
      return new SqlProvider(dbName);
    } else {
      console.warn("DATABASE_URL was not configured, storage unavailable");
      return;
    }
  }
}

export function indexedDbIsAvailable(){
  return 'indexedDB' in globalThis
}