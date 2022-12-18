import {
  base64ToBin,
  binToBase64,
  CashAddressType,
  encodeCashAddress,
  hexToBin,
  instantiateSecp256k1,
  instantiateSha256,
  RecoveryId,
  utf8ToBin,
} from "@bitauth/libauth";

import { derivePrefix } from "../util/derivePublicKeyHash.js";
import { hash160 } from "../util/hash160.js";
import {
  SignedMessageI,
  SignedMessageResponseI,
  VerifyMessageResponseI,
} from "./interface.js";

/**
 * message_magic - Add "Magic", per standard bitcoin message signing.
 *
 * In this case, the magic is simply adding the number 24 as binary "\x16", and "Bitcoin Signed Message\n" followed
 * by the size of the message in binary followed by the message encoded as binary.
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
export async function hash_message(str: string) {
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
  public async sign(
    message: string,
    privateKey: Uint8Array
  ): Promise<SignedMessageResponseI> {
    const secp256k1 = await instantiateSecp256k1();

    let messageHash = await hash_message(message);
    let rs = secp256k1.signMessageHashRecoverableCompact(
      privateKey,
      messageHash
    );
    if (typeof rs === "string") {
      throw new Error(rs);
    }
    let sigDer = secp256k1.signMessageHashDER(
      privateKey,
      messageHash
    ) as Uint8Array;
    let sigSchnorr = secp256k1.signMessageHashSchnorr(
      privateKey,
      messageHash
    ) as Uint8Array;
    let electronEncoding = new Uint8Array([
      ...[31 + rs.recoveryId],
      ...rs.signature,
    ]);
    return {
      raw: {
        ecdsa: binToBase64(rs.signature),
        schnorr: binToBase64(sigSchnorr),
        der: binToBase64(sigDer),
      },
      details: {
        recoveryId: rs.recoveryId,
        compressed: true,
        messageHash: binToBase64(messageHash),
      },
      signature: binToBase64(electronEncoding),
    };
  }

  public static async sign(message: string, privateKey: Uint8Array) {
    return new this().sign(message, privateKey);
  }
  /**
   * verify - Validate that the message is valid against a given signature
   *
   * @param {message} string     The message to verify as a utf8 string
   * @param {signature} string   The signature as a base64 encoded string
   * @param {cashaddr} string    The cashaddr to validate the signature against a recoverable signature.
   * @param {publicKey} string    If publicKey is not recoverable from the signature type, the publicKey must be passed.
   *
   * @returns a promise to signature as a string
   */
  public async verify(
    message: string,
    signature: string,
    cashaddr?: string,
    publicKey?: Uint8Array
  ): Promise<VerifyMessageResponseI> {
    // Check that the signature is valid for the given message.
    const secp256k1 = await instantiateSecp256k1();
    let messageHash = await hash_message(message);
    let sig = base64ToBin(signature);

    let valid = false;
    let pkhMatch = false;
    let pkh, signatureType;

    if (sig.length === 65) {
      let rawSig = sig.length === 65 ? sig.slice(1) : sig;
      let recoveryId = sig.slice(0, 1)[0] - 31;
      let recoveredPk = secp256k1.recoverPublicKeyCompressed(
        rawSig,
        recoveryId as RecoveryId,
        messageHash
      );
      if (typeof recoveredPk === "string") {
        throw new Error(recoveredPk);
      }

      pkh = await hash160(recoveredPk);
      signatureType = "recoverable";
      valid = secp256k1.verifySignatureCompact(
        rawSig,
        recoveredPk,
        messageHash
      );
      if (cashaddr) {
        // Validate that the signature actually matches the provided cashaddr
        let prefix = derivePrefix(cashaddr);
        let resultingCashaddr = encodeCashAddress(
          prefix,
          CashAddressType.p2pkh,
          pkh
        );
        if (resultingCashaddr === cashaddr) {
          pkhMatch = true;
        }
      }
    } else if (publicKey) {
      if (secp256k1.verifySignatureDER(sig, publicKey, messageHash)) {
        signatureType = "der";
        valid = true;
      } else if (
        secp256k1.verifySignatureSchnorr(sig, publicKey, messageHash)
      ) {
        signatureType = "schnorr";
        valid = true;
      } else if (
        secp256k1.verifySignatureCompact(sig, publicKey, messageHash)
      ) {
        signatureType = "ecdsa";
        valid = true;
      } else {
        signatureType = "na";
      }
    }

    return {
      valid: valid,
      details: {
        signatureValid: valid,
        signatureType: signatureType,
        messageHash: binToBase64(messageHash),
        publicKeyHashMatch: pkhMatch,
      },
    };
  }

  public static async verify(
    message: string,
    signature: string,
    cashaddr?: string,
    publicKey?: Uint8Array
  ) {
    return new this().verify(message, signature, cashaddr, publicKey);
  }
}
