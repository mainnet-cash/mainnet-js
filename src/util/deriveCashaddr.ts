import {
  CashAddressNetworkPrefix,
  instantiateSecp256k1,
  encodeCashAddress,
} from "@bitauth/libauth";

import { hash160 } from "./hash160";

export async function deriveCashaddr(
  privateKey: Uint8Array,
  networkPrefix: CashAddressNetworkPrefix
) {
  const secp256k1 = await instantiateSecp256k1();
  let publicKey = secp256k1.derivePublicKeyCompressed(privateKey);
  let pkh = await hash160(publicKey);
  return encodeCashAddress(networkPrefix, 0, pkh);
}
