import {
  base64ToBin,
  binToBase64,
  encodeCashAddress,
  hexToBin,
  instantiateSecp256k1,
  instantiateSha256,
  RecoveryId,
  utf8ToBin,
} from "@bitauth/libauth";

import { derivePrefix } from "../util/derivePublicKeyHash";
import { hash160 } from "../util/hash160";

function message_magic(str: string) {
  const length = utf8ToBin(str).length.toString(16);
  let payload = `\x18Bitcoin Signed Message:\n`;
  return new Uint8Array([
    ...utf8ToBin(payload),
    ...hexToBin(length),
    ...utf8ToBin(str),
  ]);
}

export async function hash_magic(str: string) {
  const h = (await instantiateSha256()).hash;
  return h(h(message_magic(str)));
}

export class SignedMessage {
  public static async sign(
    message: string,
    privateKey: Uint8Array
  ): Promise<string> {
    const secp256k1 = await instantiateSecp256k1();

    let messageHash = await hash_magic(message);
    let rs = secp256k1.signMessageHashRecoverableCompact(
      privateKey,
      messageHash
    );
    return binToBase64(rs.signature);
  }

  // see    https://github.com/Electron-Cash/Electron-Cash/blob/49f9f672364f50053a026e4a5cb30e92db2d195d/electroncash/bitcoin.py#L524
  public static async verify(
    message: string,
    signature: string,
    cashaddr: string
  ): Promise<boolean> {
    const secp256k1 = await instantiateSecp256k1();
    let messageHash = await hash_magic(message);
    let sig = base64ToBin(signature);
    let prefix = derivePrefix(cashaddr);
    let recoveryId = prefix === "bitcoincash" ? 0 : (1 as RecoveryId);
    let pk = secp256k1.recoverPublicKeyCompressed(sig, recoveryId, messageHash);
    let pkh = await hash160(pk);
    let resultingCashaddr = encodeCashAddress(prefix, 0, pkh);

    if (resultingCashaddr !== cashaddr) {
      console.log("cashaddr match failed");
      return false;
    }

    //return derivedPkh === pkh
    let valid = secp256k1.verifySignatureCompact(sig, pk, messageHash);

    return valid;
  }
}
