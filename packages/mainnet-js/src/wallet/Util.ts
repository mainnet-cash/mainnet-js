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
} from "../wallet/Wif.js";
import {
  binToHex,
  decodeTransaction as decodeTransactionLibAuth,
  hexToBin,
  lockingBytecodeToCashAddress,
  Transaction as LibAuthTransaction,
} from "@bitauth/libauth";
import {
  ElectrumRawTransaction,
  ElectrumRawTransactionVin,
  ElectrumRawTransactionVinScriptSig,
  ElectrumRawTransactionVout,
  ElectrumRawTransactionVoutScriptPubKey,
} from "../network/interface.js";
import { bchParam } from "../chain.js";
import { getTransactionHash } from "../util/transaction.js";

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

  public async getTransactionHash(rawTransactionHex: string): Promise<string> {
    return getTransactionHash(rawTransactionHex);
  }

  public static async getTransactionHash(
    rawTransactionHex: string
  ): Promise<string> {
    return getTransactionHash(rawTransactionHex);
  }

  public async decodeTransaction(
    transactionHashOrHex: string,
    loadInputValues: boolean = false
  ): Promise<ElectrumRawTransaction> {
    let transactionHex: string;
    let transactionBin: Uint8Array;
    let txHash: string;

    // raw transaction
    if (transactionHashOrHex.length > 64) {
      txHash = await this.getTransactionHash(transactionHashOrHex);
      transactionBin = hexToBin(transactionHashOrHex);
      transactionHex = transactionHashOrHex;
    } else {
      // tx hash, look up the raw transaction
      txHash = transactionHashOrHex;
      transactionHex = await this.wallet.provider!.getRawTransaction(txHash);
      transactionBin = hexToBin(transactionHex);
    }

    const result = decodeTransactionLibAuth(transactionBin);
    if (typeof result === "string") {
      throw Error(result);
    }

    const transaction = this.mapToElectrumRawTransaction(
      result,
      txHash,
      transactionHex
    );

    if (loadInputValues) {
      // get unique transaction hashes
      const hashes = [...new Set(transaction.vin.map((val) => val.txid))];
      const transactions = await Promise.all(
        hashes.map((hash) => this.decodeTransaction(hash, false))
      );
      const transactionMap = new Map<string, ElectrumRawTransaction>();
      transactions.forEach((val) => transactionMap.set(val.hash, val));

      transaction.vin.forEach((input) => {
        const output = transactionMap
          .get(input.txid)!
          .vout.find((val) => val.n === input.vout)!;
        input.address = output.scriptPubKey.addresses[0];
        input.value = output.value;
        input.tokenData = output.tokenData;
      });
    }

    return transaction;
  }

  public mapToElectrumRawTransaction(
    transaction: LibAuthTransaction,
    txHash: string,
    txHex: string
  ): ElectrumRawTransaction {
    let result: ElectrumRawTransaction = {} as any;

    result.vin = transaction.inputs.map((input): ElectrumRawTransactionVin => {
      return {
        scriptSig: {
          hex: binToHex(input.unlockingBytecode),
        } as ElectrumRawTransactionVinScriptSig,
        sequence: input.sequenceNumber,
        txid: binToHex(input.outpointTransactionHash),
        vout: input.outpointIndex,
      };
    });

    result.vout = transaction.outputs.map(
      (output, index): ElectrumRawTransactionVout => {
        return {
          n: index,
          scriptPubKey: {
            addresses: [
              lockingBytecodeToCashAddress(
                output.lockingBytecode,
                this.wallet.networkPrefix
              ).toString(),
            ],
            hex: binToHex(output.lockingBytecode),
          } as ElectrumRawTransactionVoutScriptPubKey,
          value: Number(output.valueSatoshis) / bchParam.subUnits,
        };
      }
    );

    result.locktime = transaction.locktime;
    result.version = transaction.version;
    result.hash = txHash;
    result.hex = txHex;
    result.txid = txHash;
    result.size = txHex.length / 2;

    return result;
  }

  public static async decodeTransaction(
    transactionHashOrHex: string,
    loadInputValues: boolean = false
  ): Promise<ElectrumRawTransaction> {
    return new this.walletType().util.decodeTransaction(
      transactionHashOrHex,
      loadInputValues
    );
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
