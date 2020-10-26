import { CashAddressNetworkPrefix } from "@bitauth/libauth";
// GrpcClient is swapped out by webpack for a web module
import {
  MainnetProvider,
  TestnetProvider,
  RegtestProvider,
} from "../network/default";
import { NetworkProvider } from "../network";
import { getStorageProvider } from "../db/util";

import { NetworkEnum, NetworkType } from "./enum";
import { browserNotSupported } from "../util/browserNotSupported";
import { StorageProvider } from "../db";
import { networkPrefixMap } from "./createWallet";

export default interface WalletInterface {
  /**
   * @returns An instance initialized with a secret.
   */
  initialize(secret: string): Promise<any>;

  /**
   * @returns A randomly generated instance.
   */
  generate(secret: string): Promise<any>;

  /**
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

    switch (networkPrefix) {
      case CashAddressNetworkPrefix.mainnet:
        this.network = NetworkEnum.Mainnet;
        break;
      case CashAddressNetworkPrefix.testnet:
        this.network = NetworkEnum.Testnet;
        break;
      case CashAddressNetworkPrefix.regtest:
        this.network = NetworkEnum.Regtest;
        break;
      default:
        this.network = NetworkEnum.Mainnet;
    }
    this.isTestnet = this.networkType === "testnet" ? true : false;
    if (this.isTestnet) {
      switch (this.networkPrefix) {
        case CashAddressNetworkPrefix.regtest:
          browserNotSupported();
          this.provider = RegtestProvider();
          break;
        case CashAddressNetworkPrefix.testnet:
          this.provider = TestnetProvider();
          break;
      }
    } else {
      this.provider = MainnetProvider();
    }
  }

  initialize(secret?: string): Promise<this | Error> {
    secret;
    throw Error("Cannot initialize the baseWallet class");
  }

  generate(): Promise<this | Error> {
    throw Error("Cannot generate with the baseWallet class");
  }

  _named = async (
    name: string,
    dbName?: string,
    forceNew = false
  ): Promise<this | Error> => {
    if (name.length === 0) {
      throw Error("Named wallets must have a non-empty name");
    }
    this.name = name;
    dbName = dbName ? dbName : (this.networkPrefix as string);
    let db = getStorageProvider(dbName);
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
  };

  public _fromId(secret?: string): Promise<this | Error> {
    secret;
    throw Error("Cannot parse id on BaseWallet class");
  }

  public _newRandom = async (
    name: string,
    dbName?: string
  ): Promise<this | Error> => {
    if (name.length > 0) {
      return this._named(name, dbName);
    } else {
      return this.generate();
    }
  };
}
