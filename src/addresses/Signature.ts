import {Wallet} from "..";

const base58check = require('base58check');
const cashAddrJs = require('cashaddrjs');
const bchMessage = require('bitcoinjs-message');
const {randomBytes} = require('crypto');

export default class Signature {
  message: string;
  wallet: Wallet;
  signature: Buffer;

  constructor(wallet: Wallet, message: string, signature: Buffer) {
    this.wallet = wallet;
    this.message = message;
    this.signature = signature;
  }

  static sign(message: string, wallet: Wallet): Signature {
    if (!wallet.privateKey) {
      throw Error("Private key does not exist");
    }

    const signature = bchMessage.sign(message,
      wallet.privateKey,
      true,
      {
        extraEntropy: randomBytes(32)
      }
    );

    return new Signature(wallet, message, signature);
  }

  static magicHash(message: string, messagePrefix?: string): Buffer {
    return bchMessage.magicHash(message, messagePrefix);
  }

  magicHash(messagePrefix: string): Buffer {
    return bchMessage.magicHash(this.message, messagePrefix);
  }

  cashAddressToLegacy(address: string): string {
    const decoded = cashAddrJs.decode(address);
    let rawHex = '';
    let prefix = '00';

    for (let x = 0; x < decoded.hash.length; ++x) {
      if (decoded.hash[x] < 16) rawHex += '0';
      rawHex += decoded.hash[x].toString(16);
    }

    if (decoded.type == 'P2SH') prefix = '05';

    return base58check.encode(rawHex, prefix);
  }

  verify(address: string, messagePrefix?: string): boolean {
    const legacyAddress = this.cashAddressToLegacy(address);
    return bchMessage.verify(this.message, legacyAddress, this.signature, messagePrefix);
  }
}
