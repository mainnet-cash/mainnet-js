import {
  RegTestWallet,
  RegTestWatchWallet,
  RegTestWifWallet,
  TestNetWallet,
  TestNetWatchWallet,
  TestNetWifWallet,
  Wallet,
  WatchWallet,
  WifWallet,
} from "../wallet/Wif";
import { binToBigIntUint64LE, binToHex, decodeTransaction, hexToBin, Input, instantiateSha256, lockingBytecodeToCashAddress, Output, Transaction as LibAuthTransaction, TransactionDecodingError } from "@bitauth/libauth";
import { ElectrumRawTransaction, Transaction } from "../network/interface";

let sha256;

// declare type Transaction = LibAuthTransaction<Input<Uint8Array, Uint8Array>, Output<Uint8Array, Uint8Array>>;

/**
 * Class with various wallet utilities.
 */
export class Util {
  readonly wallet: Wallet;
  static get walletType() {
    return Wallet;
  }

  /**
   * Initializes a wallet Util class.
   *
   * @param wallet     A wallet object
   */
  constructor(wallet: Wallet) {
    this.wallet = wallet;
  }

  public async getTransactionHash(transactionHashOrHex: string | Uint8Array): Promise<string> {
    const transactionBin = typeof transactionHashOrHex === 'string' ? hexToBin(transactionHashOrHex as string) : transactionHashOrHex as Uint8Array;

    if (!sha256) {
      sha256 = await instantiateSha256();
    }
    // transaction hash is a double sha256 of a raw transaction data, reversed byte order
    return binToHex(sha256.hash(sha256.hash(transactionBin)).reverse());
  }

  public static async getTransactionHash(
    transactionHashOrHex: string | Uint8Array
  ): Promise<string> {
    return new this.walletType().util.getTransactionHash(transactionHashOrHex);
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

  public static async decodeTransaction(
    transactionHashOrHex: string
  ): Promise<ElectrumRawTransaction> {
    return new this.walletType().util.decodeTransaction(transactionHashOrHex);
  }

  public async decodeTransactionLibAuth(transactionHashOrHex: string | Uint8Array, loadInputValues: boolean = false): Promise<Transaction> {
    let transactionBin: Uint8Array;
    let txHash: string;

    // raw transaction
    if (transactionHashOrHex.length > 64) {
      txHash = await this.getTransactionHash(typeof transactionHashOrHex === 'string' ? transactionHashOrHex as string : binToHex(transactionHashOrHex as Uint8Array));
      transactionBin = typeof transactionHashOrHex === 'string' ? hexToBin(transactionHashOrHex as string) : transactionHashOrHex as Uint8Array;
    } else {
      // tx hash, look up the raw transaction
      txHash = typeof transactionHashOrHex === 'string' ? transactionHashOrHex as string : binToHex(transactionHashOrHex as Uint8Array);
      const transactionHex = await this.wallet.provider!.getRawTransaction(txHash);
      transactionBin = hexToBin(transactionHex);
    }

    const result = decodeTransaction(transactionBin);
    if (result === TransactionDecodingError.invalidFormat) {
      throw Error(TransactionDecodingError.invalidFormat)
    }

    const transaction = this.mapLibAuthTransaction(result);
    transaction.hash = txHash;

    if (loadInputValues) {
      // get unique transaction hashes
      const hashes = [...new Set(transaction.inputs.map(val => val.prevoutHash))];
      const transactions = await Promise.all(hashes.map(hash => this.decodeTransactionLibAuth(hash, false)));
      const transactionMap = new Map<string, Transaction>();
      transactions.forEach(val => transactionMap.set(val.hash, val));

      transaction.inputs.forEach(input => {
        const output = transactionMap.get(input.prevoutHash)!.outputs.find(val => val.index === input.vout)!;
        input.cashaddr = output.cashaddr;
        input.value = output.value;
      });
    }

    return transaction;
  }

  public mapLibAuthTransaction(transaction: LibAuthTransaction): Transaction {
    let result: Transaction = {} as any;

    result.inputs = transaction.inputs.map(input => { return {
      vout: input.outpointIndex,
      prevoutHash: binToHex(input.outpointTransactionHash),
      sequence: input.sequenceNumber
    } });

    result.outputs = transaction.outputs.map((output, index) => {
      return {
        index: index,
        cashaddr: lockingBytecodeToCashAddress(output.lockingBytecode, this.wallet.networkPrefix).toString(),
        value: Number(binToBigIntUint64LE(output.satoshis)),
      }
    });

    result.locktime = transaction.locktime;
    result.version = transaction.version;


    return result;
  }

  public static async decodeTransactionLibAuth(transactionHashOrHex: string | Uint8Array, loadInputValues: boolean = false): Promise<Transaction> {
    return new this.walletType().util.decodeTransactionLibAuth(transactionHashOrHex, loadInputValues);
  }
}

//#region Specific wallet classes
/**
 * Class to manage an slp enabled testnet wallet.
 */
export class TestNetUtil extends Util {
  static get walletType() {
    return TestNetWallet;
  }
}

/**
 * Class to manage an slp enabled regtest wallet.
 */
export class RegTestUtil extends Util {
  static get walletType() {
    return RegTestWallet;
  }
}

/**
 * Class to manage a bitcoin cash wif wallet.
 */
export class WifUtil extends Util {
  static get walletType() {
    return WifWallet;
  }
}

/**
 * Class to manage a testnet wif wallet.
 */
export class TestNetWifUtil extends Util {
  static get walletType() {
    return TestNetWifWallet;
  }
}

/**
 * Class to manage a regtest wif wallet.
 */
export class RegTestWifUtil extends Util {
  static get walletType() {
    return RegTestWifWallet;
  }
}

/**
 * Class to manage a bitcoin cash watch wallet.
 */
export class WatchUtil extends Util {
  static get walletType() {
    return WatchWallet;
  }
}

/**
 * Class to manage a testnet watch wallet.
 */
export class TestNetWatchUtil extends Util {
  static get walletType() {
    return TestNetWatchWallet;
  }
}

/**
 * Class to manage a regtest watch wallet.
 */
export class RegTestWatchUtil extends Util {
  static get walletType() {
    return RegTestWatchWallet;
  }
}
//#endregion
