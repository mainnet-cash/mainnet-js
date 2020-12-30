import { Wallet } from "..";

const base58check = require("base58check");
const cashAddrJs = require("cashaddrjs");
import sha256 from "crypto-js/sha256";
import { instantiateSecp256k1 } from "@bitauth/libauth";

export default class Signature {
  message: string;
  wallet: Wallet;
  signature: Uint8Array;
  publicKey?: Uint8Array;

  constructor(wallet: Wallet, message: string, signature: Uint8Array) {
    this.wallet = wallet;
    this.message = message;
    this.signature = signature;
  }

  static async sign(message: string, wallet: Wallet): Promise<Signature> {
    if (!wallet.privateKey) {
      throw Error("Private key does not exist");
    }

    const secp256k1 = await instantiateSecp256k1();

    const signature = secp256k1.signMessageHashDER(
      wallet.privateKey,
      this.magicHash(message)
    );

    return new Signature(wallet, message, signature);
  }

  static magicHash(message: string, messagePrefix?: string): Buffer {
    return sha256(messagePrefix + message);
  }

  magicHash(messagePrefix?: string): Buffer {
    return sha256(messagePrefix + this.message);
  }

  cashAddressToLegacy(address: string): string {
    const decoded = cashAddrJs.decode(address);
    let rawHex = "";
    let prefix = "00";

    for (let x = 0; x < decoded.hash.length; ++x) {
      if (decoded.hash[x] < 16) rawHex += "0";
      rawHex += decoded.hash[x].toString(16);
    }

    if (decoded.type == "P2SH") prefix = "05";

    return base58check.encode(rawHex, prefix);
  }

  async verify(address: string, messagePrefix?: string): Promise<boolean> {
    const secp256k1 = await instantiateSecp256k1();
    const hash = this.magicHash(messagePrefix + this.message);

    const wallet = await this.wallet.watchOnly(address);
    return secp256k1.verifySignatureDERLowS(
      this.signature,
      wallet.publicKey!,
      new Uint8Array(hash)
    );
  }
}
