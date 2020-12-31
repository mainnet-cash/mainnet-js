import { getPlatform } from "./getPlatform";

export function generateRandomBytes(len = 32) {
  // nodejs
  if (getPlatform() === "node") {
    let crypto = require("crypto");
    return crypto.randomBytes(len);
  }
  // window, webworkers, service workers
  else {
    return window.crypto.getRandomValues(new Uint8Array(len));
  }
}
