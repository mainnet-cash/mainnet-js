import { ripemd160, sha256 } from "@bitauth/libauth";

/**
 * hash160 - Calculate the sha256, ripemd160 hash of a value
 *
 * @param {message} Uint8Array       value to hash as a binary array
 *
 * @returns a promise to the hash160 value of the input
 */
export function hash160(message: Uint8Array) {
  return ripemd160.hash(sha256.hash(message));
}
