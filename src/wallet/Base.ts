import { CashAddressNetworkPrefix } from "@bitauth/libauth";
import { getNetworkProvider } from "../network/default";
import { default as NetworkProvider } from "../network/NetworkProvider";
import { getStorageProvider } from "../db/util";
import { WalletI } from "./interface";
import { NetworkEnum, NetworkType } from "../enum";
import { StorageProvider } from "../db";
import { getPlatform } from "../util";

/**
 * A class to hold features used by all wallets
 * @class  BaseWallet
 */
export class BaseWallet implements WalletI {
  provider?: NetworkProvider;
  storage?: StorageProvider;
  isTestnet?: boolean;
  name: string;
  networkPrefix: CashAddressNetworkPrefix;
  networkType: NetworkType;
  network: NetworkEnum;

  constructor(name = "", networkPrefix = CashAddressNetworkPrefix.mainnet) {
    this.name = name;

    this.networkPrefix = networkPrefix;

    switch (this.networkPrefix) {
      case CashAddressNetworkPrefix.regtest:
        this.network = NetworkEnum.Regtest;
        this.networkType = NetworkType.Regtest;
        this.provider = getNetworkProvider("regtest");
        break;
      case CashAddressNetworkPrefix.testnet:
        this.network = NetworkEnum.Testnet;
        this.networkType = NetworkType.Testnet;
        this.provider = getNetworkProvider("testnet");
        break;
      default:
        this.network = NetworkEnum.Mainnet;
        this.networkType = NetworkType.Mainnet;
        this.provider = getNetworkProvider();
    }

    this.isTestnet = this.networkType === "testnet" ? true : false;
  }

  /**
   * generate creates a new wallet
   * @throws {Error} if called on BaseWallet
   */

  generate(): Promise<this> {
    throw Error("Cannot generate with the baseWallet class");
  }

  /**
   * _named (internal) get a named wallet from the database or create a new one.
   * Note: this function should behave identically if
   *
   * @param {string} name              name of the wallet
   * @param {string} dbName            database name the wallet is stored in
   * @param {boolean} forceNew         attempt to overwrite an existing wallet
   *
   * @throws {Error} if forceNew is true and the wallet already exists
   * @returns a promise to a named wallet
   */
  _named = async (
    name: string,
    dbName?: string,
    forceNew = false
  ): Promise<this> => {
    if (name.length === 0) {
      throw Error("Named wallets must have a non-empty name");
    }
    _checkContextSafety(this);
    this.name = name;
    dbName = dbName ? dbName : (this.networkPrefix as string);
    let db = getStorageProvider(dbName);
    if (db) {
      await db.init();
      let savedWalletRecord = await db.getWallet(name);
      if (savedWalletRecord) {
        await db.close();
        if (forceNew) {
          throw Error(
            `A wallet with the name ${name} already exists in ${dbName}`
          );
        }
        let recoveredWallet = await this._fromId(savedWalletRecord.wallet);
        recoveredWallet.name = savedWalletRecord.name;
        return recoveredWallet;
      } else {
        let wallet = await this.generate();
        await db.addWallet(wallet.name, wallet.toDbString());
        await db.close();
        return wallet;
      }
    } else {
      throw Error(
        "No database was available or configured to store the named wallet."
      );
    }
  };

  /**
   * _fromId (internal) creates a wallet from serialized string
   * @throws {Error} if called on BaseWallet
   */
  public _fromId(secret?: string): Promise<this> {
    secret;
    throw Error("Cannot parse id on BaseWallet class");
  }

  /**
   * toDbString store the serialized version of the wallet in the database, not just the name
   * @throws {Error} if called on BaseWallet
   */
  public toDbString(): string {
    throw Error("toDbString called on base wallet, which is not serializable");
  }

  /**
   * _newRandom (internal) if the wallet is named, get or create it; otherwise create a random
   * unnamed wallet
   * @param {string} name              name of the wallet
   * @param {string} dbName            database name the wallet is stored in
   */
  public _newRandom = async (name: string, dbName?: string): Promise<this> => {
    if (name.length > 0) {
      return this._named(name, dbName);
    } else {
      return this.generate();
    }
  };
}

/**
 * _checkContextSafety (internal) if running in nodejs, will disable saving
 * mainnet wallets on public servers if ALLOW_MAINNET_USER_WALLETS is set to false
 * @param {BaseWallet} wallet        a wallet
 */
const _checkContextSafety = function (wallet: BaseWallet) {
  if (getPlatform() === "node") {
    if (process.env.ALLOW_MAINNET_USER_WALLETS === `false`) {
      if (wallet.networkType === NetworkType.Mainnet) {
        throw Error(
          `Refusing to save wallet in an open public database, remove ALLOW_MAINNET_USER_WALLETS="false", if this service is secure and private`
        );
      }
    }
  }
};
