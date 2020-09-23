export function browserNotSupported() {
  if (typeof process === "undefined") {
    throw new Error("This usage is not supported in the browser at this time.");
  }
}
