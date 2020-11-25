import { default as IndexedDBProvider } from "./IndexedDBProvider";
import { default as SqlProvider } from "./SqlProvider";

export function getStorageProvider(dbName: string) {
  if (typeof process === "undefined") {
    return new IndexedDBProvider(dbName);
  } else {
    if ("DATABASE_URL" in process.env) {
      return new SqlProvider(dbName);
    } else {
      return undefined;
    }
  }
}
