import { StorageProvider } from ".";
import { getRuntimePlatform } from "../util/index";
import { default as IndexedDBProvider } from "./IndexedDBProvider";
import { default as SqlProvider } from "./SqlProvider";
import { sslConfigI } from "./interface";

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

export function indexedDbIsAvailable() {
  return "indexedDB" in globalThis;
}

export function getSslConfig(): sslConfigI {
  let ssl: sslConfigI = {
    rejectUnauthorized:
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED == "false" ? false : true,
    ca: process.env.DATABASE_SSL_CA,
    key: process.env.DATABASE_SSL_KEY,
    cert: process.env.DATABASE_SSL_CERT,
  };
  return ssl;
}
