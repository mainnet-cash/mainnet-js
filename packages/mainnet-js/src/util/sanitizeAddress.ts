import { derivePrefix } from "./derivePublicKeyHash.js";

// Assure address is prefixed.
export function sanitizeAddress(address: string) {
  if (address.includes(":")) {
    return address;
  } else {
    return `${derivePrefix(address)}:${address}`;
  }
}
