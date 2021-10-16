import { getRuntimePlatform } from "./getRuntimePlatform";

export function generateRandomBytes(len = 32) {
  // nodejs
  if (getRuntimePlatform() === "node") {
    //
    const crypto = eval("require")("crypto");
    return crypto.randomBytes(len);
  }
  // window, webworkers, service workers
  else {
    return window.crypto.getRandomValues(new Uint8Array(len));
  }
}
