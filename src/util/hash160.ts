import { instantiateSha256, instantiateRipemd160 } from "@bitauth/libauth";


/**
 * hash160 - Calculate the sha256, ripemd160 hash of a value
 *
 * @param {message} Uint8Array       value to hash as a binary array
 *
 * @returns a promise to the hash160 value of the input
 */
export async function hash160(message: Uint8Array) {
  const ripemd160 = await instantiateRipemd160();
  const sha256 = await instantiateSha256();
  return ripemd160.hash(sha256.hash(message));
}
