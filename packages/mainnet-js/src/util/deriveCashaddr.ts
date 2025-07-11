import {
  CashAddressNetworkPrefix,
  CashAddressType,
  decodeCashAddress,
  DecodedCashAddress,
  encodeCashAddress,
  secp256k1,
} from "@bitauth/libauth";
import { hash160 } from "./hash160.js";

export function isValidAddress(cashaddr: string): boolean {
  const result = decodeCashAddress(cashaddr);
  if (typeof result === "string") {
    return false;
  }

  return true;
}

export function deriveCashaddr(
  privateKey: Uint8Array,
  networkPrefix: CashAddressNetworkPrefix
): string {
  let publicKey = secp256k1.derivePublicKeyCompressed(privateKey);
  if (typeof publicKey === "string") {
    throw new Error(publicKey);
  }
  let pkh = hash160(publicKey);
  return encodeCashAddress({
    prefix: networkPrefix,
    type: CashAddressType.p2pkh,
    payload: pkh,
  }).address;
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

  return encodeCashAddress({
    prefix: networkPrefix,
    type: CashAddressType.p2pkhWithTokens,
    payload: publicKeyHash,
  }).address;
}

function decodeAddress(address: string): DecodedCashAddress {
  const result = decodeCashAddress(address);
  if (typeof result === "string") {
    throw new Error(result);
  }
  return result;
}

export function toCashaddr(address: string): string {
  const result = decodeAddress(address);

  return encodeCashAddress({
    prefix: result.prefix as CashAddressNetworkPrefix,
    type: result.type.replace("WithTokens", "") as CashAddressType,
    payload: result.payload,
  }).address;
}

export function toTokenaddr(address: string): string {
  const result = decodeAddress(address);

  return encodeCashAddress({
    prefix: result.prefix as CashAddressNetworkPrefix,
    type: result.type.replace("WithTokens", "") + "WithTokens" as CashAddressType,
    payload: result.payload,
  }).address;
}

export function isTokenaddr(address: string): boolean {
  const result = decodeAddress(address);

  return result.type.endsWith("WithTokens");
}

export function checkTokenaddr(cashaddr: string, enforce: boolean) {
  if (enforce && !isTokenaddr(cashaddr)) {
    throw new Error("Error trying to send to a non-tokenaware cash address");
  }
}
