export function indexedDbIsAvailable() {
  return "indexedDB" in globalThis;
}
