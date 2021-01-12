import { getRuntimePlatform } from "./getRuntimePlatform";

export function browserNotSupported() {
  if (getRuntimePlatform() !== "node") {
    throw new Error("This usage is not supported in the browser at this time.");
  }
}
