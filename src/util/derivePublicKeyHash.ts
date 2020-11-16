import {
  decodeCashAddressFormat,
  decodeCashAddressFormatWithoutPrefix,
} from "@bitauth/libauth";

/**
 * Helper function to convert an address to a hash
 *
 * @param address   Address to convert to a hash
 *
 * @returns a public key hash corresponding to the passed address
 */
export function derivePublicKeyHash(address: string): Uint8Array {
  let result;

  // If the address has a prefix decode it as is
  if (address.includes(":")) {
    result = decodeCashAddressFormat(address);
  }
  // otherwise, derive the network from the address without prefix
  else {
    result = decodeCashAddressFormatWithoutPrefix(address);
  }

  if (typeof result === "string") throw new Error(result);

  // TODO pass the network in and check it or raise Error
  return result.hash;
}

/**
 * Helper function to convert an address prefix
 *
 * @param address   Address with or without prefix
 *
 * @returns the address prefix
 */
export function derivePrefix(address: string): string {
  let result;

  if (address.includes(":")) {
    result = decodeCashAddressFormat(address);
  } else {
    result = decodeCashAddressFormatWithoutPrefix(address);
  }

  if (typeof result === "string") throw new Error(result);

  // TODO pass the network in and check it or raise Error
  return result.prefix;
}
