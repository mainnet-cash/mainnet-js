

import { 
    decodeCashAddressFormat,
    decodeCashAddressFormatWithoutPrefix } from "@bitauth/libauth";

/**
 * Helper function to convert an address to a locking script
 *
 * @param address   Address to convert to locking script
 *
 * @returns a locking script corresponding to the passed address
 */
export function derivePublicKeyHash(address: string): Uint8Array {
  const result = decodeCashAddressFormat(address);

  if (typeof result === "string") throw new Error(result);

  // TODO pass the network in and check it or raise Error
  return result.hash;
}
