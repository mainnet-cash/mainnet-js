import { Wallet } from "../wallet/Wif";
import {
  binToHex,
  hexToBin,
  instantiateSha256,
  instantiateSha256Bytes,
  Sha256,
} from "@bitauth/libauth";
import { ElectrumRawTransaction } from "../network/interface";

/**
 * Class with various wallet utilities.
 */
export class Util {
  readonly wallet: Wallet;
  /**
   * Initializes a wallet Util class.
   *
   * @param wallet     A wallet object
   */
  constructor(wallet: Wallet) {
    this.wallet = wallet;
  }

  public async getTransactionHash(rawTransactionHex: string): Promise<string> {
    const transactionBin = hexToBin(rawTransactionHex);

    const sha256 = await instantiateSha256();
    // transaction hash is a double sha256 of a raw transaction data, reversed byte order
    return binToHex(sha256.hash(sha256.hash(transactionBin)).reverse());
  }

  public async decodeTransaction(
    transactionHashOrHex: string
  ): Promise<ElectrumRawTransaction> {
    if (transactionHashOrHex.length > 64) {
      transactionHashOrHex = await this.getTransactionHash(
        transactionHashOrHex
      );
    }

    return await this.wallet.provider!.getRawTransactionObject(
      transactionHashOrHex
    );
  }
}
