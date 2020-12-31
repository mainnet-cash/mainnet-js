import { StorageProvider } from ".";
import { getPlatform } from "../util";
import { default as IndexedDBProvider } from "./IndexedDBProvider";
import { default as SqlProvider } from "./SqlProvider";

export function getStorageProvider(
  dbName: string
): StorageProvider | undefined {
  if (getPlatform() !== "node") {
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
