import { RegTestWallet, RegTestWatchWallet, RegTestWifWallet, TestNetWallet, TestNetWatchWallet, TestNetWifWallet, Wallet, WatchWallet, WifWallet } from "../wallet/Wif";
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
    const transactionBin = hexToBin(rawTransactionHex);

    const sha256 = await instantiateSha256();
    // transaction hash is a double sha256 of a raw transaction data, reversed byte order
    return binToHex(sha256.hash(sha256.hash(transactionBin)).reverse());
  }

  public static async getTransactionHash(rawTransactionHex: string): Promise<string> {
    return new this.walletType().util.getTransactionHash(rawTransactionHex);
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

  public static async decodeTransaction(transactionHashOrHex: string): Promise<ElectrumRawTransaction> {
    return new this.walletType().util.decodeTransaction(transactionHashOrHex);
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
