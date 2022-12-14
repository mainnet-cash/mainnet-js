import {
  CashAddressNetworkPrefix,
  encodeCashAddress,
  CashAddressType,
  secp256k1,
  decodeCashAddressFormat,
  decodeCashAddressFormatWithoutPrefix,
  CashAddressVersionByte,
} from "@bitauth/libauth";

import { hash160 } from "./hash160.js";

export function deriveCashaddr(
  privateKey: Uint8Array,
  networkPrefix: CashAddressNetworkPrefix
): string {
  let publicKey = secp256k1.derivePublicKeyCompressed(privateKey);
  if (typeof publicKey === "string") {
    throw new Error(publicKey);
  }
  let pkh = hash160(publicKey);
  return encodeCashAddress(networkPrefix, CashAddressType.p2pkh, pkh);
}

export function deriveTokenaddr(
  key: Uint8Array,
  networkPrefix: CashAddressNetworkPrefix
): string {
  let publicKeyHash: Uint8Array;
  // private key
  if (key.length === 32) {
    let publicKeyCompressed = secp256k1.derivePublicKeyCompressed(key);
    if (typeof publicKeyCompressed === "string") {
      throw new Error(publicKeyCompressed);
    }
    publicKeyHash = hash160(publicKeyCompressed);
  } else if (key.length === 65) {
    // uncompressed public key
    let publicKeyCompressed = secp256k1.compressPublicKey(key);
    if (typeof publicKeyCompressed === "string") {
      throw new Error(publicKeyCompressed);
    }
    publicKeyHash = hash160(publicKeyCompressed);
  } else if (key.length === 33) {
    // compressed public key
    publicKeyHash = hash160(key);
  } else if (key.length === 20) {
    // public key hash
    publicKeyHash = key;
  } else {
    throw new Error("Unsupported type of key");
  }

  return encodeCashAddress(
    networkPrefix,
    CashAddressType.p2pkhWithTokens,
    publicKeyHash
  );
}

export function toCashaddr(tokenaddr: string): string {
  let result:
    | string
    | { payload: Uint8Array; prefix: string; version: number }
    | undefined;

  // If the address has a prefix decode it as is
  if (tokenaddr.includes(":")) {
    result = decodeCashAddressFormat(tokenaddr);
  }
  // otherwise, derive the network from the tokenaddr without prefix
  else {
    result = decodeCashAddressFormatWithoutPrefix(tokenaddr);
  }

  if (typeof result === "string") throw new Error(result);

  return encodeCashAddress(
    result.prefix as CashAddressNetworkPrefix,
    CashAddressType.p2pkh,
    result.payload
  );
}

export function toTokenaddr(cashaddr: string): string {
  let result:
    | string
    | { payload: Uint8Array; prefix: string; version: number }
    | undefined;

  // If the address has a prefix decode it as is
  if (cashaddr.includes(":")) {
    result = decodeCashAddressFormat(cashaddr);
  }
  // otherwise, derive the network from the cashaddr without prefix
  else {
    result = decodeCashAddressFormatWithoutPrefix(cashaddr);
  }

  if (typeof result === "string") throw new Error(result);

  return encodeCashAddress(
    result.prefix as CashAddressNetworkPrefix,
    CashAddressType.p2pkhWithTokens,
    result.payload
  );
}

export function isTokenaddr(address: string): boolean {
  let result:
    | string
    | { payload: Uint8Array; prefix: string; version: number }
    | undefined;

  // If the address has a prefix decode it as is
  if (address.includes(":")) {
    result = decodeCashAddressFormat(address);
  }
  // otherwise, derive the network from the address without prefix
  else {
    result = decodeCashAddressFormatWithoutPrefix(address);
  }

  if (typeof result === "string") throw new Error(result);

  return (
    [
      CashAddressVersionByte.p2pkhWithTokens,
      CashAddressVersionByte.p2sh20WithTokens,
      CashAddressVersionByte.p2sh32WithTokens,
    ].indexOf(result.version) !== -1
  );
}
