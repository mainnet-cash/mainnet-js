import { default as IndexedDBProvider } from "./IndexedDBProvider";
import { default as SqlProvider } from "./SqlProvider";

export function getStorageProvider(dbName: string) {
  if (typeof process === "undefined") {
    return new IndexedDBProvider(dbName);
  } else {
    return new SqlProvider(dbName);
  }
}
