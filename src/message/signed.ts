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
import { SignedMessageI } from "./interface";

/**
 * message_magic - "Magic" per standard bitcoin message signing.
 *
 * In this case, the magic is simply adding "b'24' + Bitcoin Signed Message\n" followed
 * by the size of the message in binary and the message encoded as binary.
 *
 * @param {str} string    The string to add the magic syntax to.
 *
 * @returns a promise to the string as binary array with magic syntax
 */
// see    https://github.com/Electron-Cash/Electron-Cash/blob/49f9f672364f50053a026e4a5cb30e92db2d195d/electroncash/bitcoin.py#L524
function message_magic(str: string) {
  const length = utf8ToBin(str).length.toString(16);
  let payload = `\x18Bitcoin Signed Message:\n`;
  return new Uint8Array([
    ...utf8ToBin(payload),
    ...hexToBin(length),
    ...utf8ToBin(str),
  ]);
}

/**
 * hash_magic - Return the hash of the string that has undergone standard formatting
 *
 * @param {str} string    The string to hash
 *
 * @returns a promise to the hash of the string.
 */
export async function hash_magic(str: string) {
  const h = (await instantiateSha256()).hash;
  return h(h(message_magic(str)));
}

export class SignedMessage implements SignedMessageI {
  /**
   * sign - Calculate the recoverable signed checksum of a string message.
   *
   * @param {message} string          The
   * @param {privateKey} Uint8Array   The private key to sign the message with
   *
   * @returns a promise to signature as a string
   */
  public async sign(message: string, privateKey: Uint8Array): Promise<string> {
    const secp256k1 = await instantiateSecp256k1();

    let messageHash = await hash_magic(message);
    let rs = secp256k1.signMessageHashRecoverableCompact(
      privateKey,
      messageHash
    );
    return binToBase64(rs.signature);
  }

  public static async sign(message: string, privateKey: Uint8Array) {
    return new this().sign(message, privateKey);
  }
  /**
   * verify - Validate that the message is valid against a given signature
   *
   * @param {message} string     The message to verify as a utf8 string
   * @param {signature} string   The signature as a base64 encoded string
   * @param {cashaddr} string    The cashaddr to validate the signature against.
   *
   * @returns a promise to signature as a string
   */
  public async verify(
    message: string,
    signature: string,
    cashaddr: string
  ): Promise<boolean> {
    // Check that the signature is valid for the given message.
    const secp256k1 = await instantiateSecp256k1();
    let messageHash = await hash_magic(message);
    let sig = base64ToBin(signature);
    let prefix = derivePrefix(cashaddr);
    let recoveryId = prefix === "bitcoincash" ? 0 : (1 as RecoveryId);
    let pk = secp256k1.recoverPublicKeyCompressed(sig, recoveryId, messageHash);
    let pkh = await hash160(pk);
    let valid = secp256k1.verifySignatureCompact(sig, pk, messageHash);

    // Validate that the signature actually matches the provided cashaddr
    let resultingCashaddr = encodeCashAddress(prefix, 0, pkh);
    if (resultingCashaddr !== cashaddr) {
      console.log("cashaddr match failed");
      return false;
    }

    return valid;
  }

  public static async verify(
    message: string,
    signature: string,
    cashaddr: string
  ) {
    return new this().verify(message, signature, cashaddr);
  }
}
