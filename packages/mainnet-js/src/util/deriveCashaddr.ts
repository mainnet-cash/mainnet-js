import {
  CashAddressNetworkPrefix,
  instantiateSecp256k1,
  encodeCashAddress,
  CashAddressType,
} from "@bitauth/libauth";

import { hash160 } from "./hash160.js";

export async function deriveCashaddr(
  privateKey: Uint8Array,
  networkPrefix: CashAddressNetworkPrefix
): Promise<string> {
  const secp256k1 = await instantiateSecp256k1();
  let publicKey = secp256k1.derivePublicKeyCompressed(privateKey);
  if (typeof publicKey === "string") {
    throw new Error(publicKey);
  }
  let pkh = await hash160(publicKey);
  return encodeCashAddress(networkPrefix, CashAddressType.p2pkh, pkh);
}
