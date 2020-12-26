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

  static async sign(message: string, wallet: Wallet): Promise<Signature> {
    if (!wallet.privateKey) {
      throw Error("Private key does not exist");
    }

    try {
      const signature = await bchMessage.sign(message,
        wallet.privateKey,
        true,
        {
          extraEntropy: randomBytes(32)
        }
      );

      return new Signature(wallet, message, signature);
    } catch (e) {
      throw Error(e)
    }
  }

  static magicHash(message, messagePrefix?): Buffer {
    return bchMessage.magicHash(message, messagePrefix);
  }

  magicHash(messagePrefix): Buffer {
    return bchMessage.magicHash(this.message, messagePrefix);
  }

  verify(address, messagePrefix?: string): boolean {
    return bchMessage.verify(this.message, address, this.signature, messagePrefix);
  }
}
