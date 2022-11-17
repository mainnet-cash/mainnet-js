import { getRuntimePlatform } from "./getRuntimePlatform.js";
import crypto from "crypto";

export function generateRandomBytes(len = 32) {
  // nodejs
  if (getRuntimePlatform() === "node") {
    return crypto.randomBytes(len);
  }
  // window, webworkers, service workers
  else {
    return window.crypto.getRandomValues(new Uint8Array(len));
  }
}
