import {Wallet} from "..";
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
    if(!wallet.privateKey){
      throw Error("Private key does not exist");
    }
    let signature = bchMessage.sign(message,
      wallet.privateKey,
      true,
      {
        extraEntropy: randomBytes(32)
      }
    );
    return new Signature(wallet, message, signature);
  }

  static magicHash(message, messagePrefix): Buffer {
    return bchMessage.magicHash(message, messagePrefix);
  }

  magicHash(messagePrefix): Buffer {
    return bchMessage.magicHash(this.message, messagePrefix);
  }

  verify(address, messagePrefix?: string): boolean {
    return bchMessage.verify(this.message, address, this.signature, messagePrefix);
  }
}
