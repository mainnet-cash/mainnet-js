import { getRuntimePlatform } from "./getRuntimePlatform";

if (getRuntimePlatform() === "node") {
  if (!globalThis.crypto || !globalThis.crypto.getRandomValues) {
    const crypto = require("crypto");
    globalThis.crypto = crypto;
    (globalThis.crypto as any).getRandomValues = (buf: Uint8Array) => {
      const bytes = crypto.randomBytes(buf.length);
      buf.set(bytes);
      return buf;
    };
  }
}
