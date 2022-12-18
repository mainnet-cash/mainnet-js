import { getRuntimePlatform } from "./getRuntimePlatform.js";
import crypto from "crypto";

if (getRuntimePlatform() === "node") {
  if (!globalThis.crypto || !globalThis.crypto.getRandomValues) {
    (globalThis as any).crypto = crypto;
    // (globalThis.crypto as any).getRandomValues = (buf: Uint8Array) => {
    //   const bytes = crypto.randomBytes(buf.length);
    //   buf.set(bytes);
    //   return buf;
    // };
  }
}
