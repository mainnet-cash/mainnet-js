import { getRuntimePlatform } from "../util/getRuntimePlatform.js";
import IndexedDBProvider from "./IndexedDBProvider.js";
import SqlProvider from "./SqlProvider.js";
import StorageProvider from "./StorageProvider.js";
import { indexedDbIsAvailable } from "./util.js";

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
