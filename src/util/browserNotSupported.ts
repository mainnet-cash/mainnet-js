import { getPlatform } from "./getPlatform";

export function browserNotSupported() {
  if (getPlatform() !== "node") {
    throw new Error("This usage is not supported in the browser at this time.");
  }
}
