import {
  CashAddressNetworkPrefix,
  encodeCashAddress,
  CashAddressType,
  secp256k1,
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
