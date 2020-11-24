import { CashAddressNetworkPrefix } from "@bitauth/libauth";
// GrpcClient is swapped out by webpack for a web module
import { getNetworkProvider } from "../network/default";
import { default as NetworkProvider } from "../network/NetworkProvider";
import { getStorageProvider } from "../db/util";

import { NetworkEnum, NetworkType } from "../enum";
import { StorageProvider } from "../db";

export default interface WalletInterface {
  /**
   * generate should randomly create a new wallet
   * @returns A randomly generated instance.
   */
  generate(): Promise<any>;

  /**
   * toString should retrun a serialized representation of the Wallet
   * @returns returns a serialized representation of the wallet
   */
  toString(): string;
}

/**
 * A class to hold features used by all wallets
 * @class  BaseWallet
 */
export class BaseWallet implements WalletInterface {
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
    this.networkType =
      this.networkPrefix === CashAddressNetworkPrefix.mainnet
        ? NetworkType.Mainnet
        : NetworkType.Testnet;

    this.isTestnet = this.networkType === "testnet" ? true : false;
    switch (this.networkPrefix) {
      case CashAddressNetworkPrefix.regtest:
        this.network = NetworkEnum.Regtest;
        this.provider = getNetworkProvider("regtest");
        break;
      case CashAddressNetworkPrefix.testnet:
        this.network = NetworkEnum.Testnet;
        this.provider = getNetworkProvider("testnet");
        break;
      default:
        this.network = NetworkEnum.Mainnet;
        this.provider = getNetworkProvider();
    }
  }

  generate(): Promise<this> {
    throw Error("Cannot generate with the baseWallet class");
  }

  _named = async (
    name: string,
    dbName?: string,
    forceNew = false
  ): Promise<this> => {
    if (name.length === 0) {
      throw Error("Named wallets must have a non-empty name");
    }
    checkContextSafety(this);
    this.name = name;
    dbName = dbName ? dbName : (this.networkPrefix as string);
    let db = getStorageProvider(dbName);
    if (db) {
      await db.init();
      let savedWallet = await db.getWallet(name);
      if (savedWallet) {
        await db.close();
        if (forceNew) {
          throw Error(
            `A wallet with the name ${name} already exists in ${dbName}`
          );
        }
        return this._fromId(savedWallet.wallet);
      } else {
        let wallet = await this.generate();
        await db.addWallet(wallet.name, wallet.toString());
        await db.close();
        return wallet;
      }
    } else {
      return await this.generate();
    }
  };

  public _fromId(secret?: string): Promise<this> {
    secret;
    throw Error("Cannot parse id on BaseWallet class");
  }

  public _newRandom = async (name: string, dbName?: string): Promise<this> => {
    if (name.length > 0) {
      return this._named(name, dbName);
    } else {
      return this.generate();
    }
  };
}

const checkContextSafety = function (wallet: BaseWallet) {
  if (typeof process !== "undefined") {
    if (process.env.ALLOW_MAINNET_USER_WALLETS === `false`) {
      if (wallet.networkType === NetworkType.Mainnet) {
        throw Error(
          `Refusing to save wallet in an open public database, remove ALLOW_MAINNET_USER_WALLETS="false", if this service is secure and private`
        );
      }
    }
  }
};
