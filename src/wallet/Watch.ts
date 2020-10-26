import { BaseWallet } from "./Base";
import { UnitEnum, WalletTypeEnum } from "./enum";
import { qrAddress, Image } from "../qr/Qr";
import { networkPrefixMap } from "./createWallet";

import {
  balanceFromSatoshi,
  balanceResponseFromSatoshi,
  BalanceResponse,
} from "../util/balanceObjectFromSatoshi";

import { CashAddressNetworkPrefix } from "@bitauth/libauth";

export class WatchWallet extends BaseWallet {
  publicKey?: Uint8Array;
  walletType?: WalletTypeEnum;
  cashaddr?: string;

  constructor(name = "", networkPrefix = CashAddressNetworkPrefix.mainnet) {
    super(name, networkPrefix);
    this.name = name;
    this.walletType = WalletTypeEnum.Watch;
  }

  // Initialize wallet from a cash addr
  public async initialize(address: string) {
    let addressComponents = address.split(":");
    let addressPrefix, addressBase;
    if (addressComponents.length === 1) {
      addressBase = addressComponents.shift() as string;
      this.cashaddr = addressBase;
    } else {
      addressPrefix = addressComponents.shift() as string;
      addressBase = addressComponents.shift() as string;
      if (addressPrefix in networkPrefixMap) {
        if (networkPrefixMap[addressPrefix] != this.network) {
          throw Error(
            `a ${addressPrefix} address cannot be watched from a ${this.network} Wallet`
          );
        }
      }
      this.cashaddr = `${addressPrefix}:${addressBase}`;
    }

    return this;
  }

  public _fromId = async (walletId: string): Promise<this | Error> => {
    let [walletType, networkGiven, privateImport]: string[] = walletId.split(
      ":"
    );
    if (this.walletType != walletType) {
      throw Error(
        `walletType ${walletType} passed to a ${this.walletType} wallet`
      );
    }
    if (networkPrefixMap[this.networkPrefix] != networkGiven) {
      throw Error(
        `Network prefix ${networkGiven} to a ${
          networkPrefixMap[this.networkPrefix]
        } wallet`
      );
    }
    return this.initialize(privateImport);
  };

  public static async fromId(walletId: string) {
    return await new this()._fromId(walletId);
  }

  public getDepositAddress() {
    return this.cashaddr;
  }

  public getDepositQr(): Image {
    return qrAddress(this.cashaddr as string);
  }

  public getBalanceFromNetwork(): Promise<number> {
    return this.provider!.getBalance(this.cashaddr!);
  }

  public async getBalance(rawUnit?: string): Promise<BalanceResponse | number> {
    if (rawUnit) {
      const unit = rawUnit.toLocaleLowerCase() as UnitEnum;
      return await balanceFromSatoshi(await this.getBalanceFromNetwork(), unit);
    } else {
      return await balanceResponseFromSatoshi(
        await this.getBalanceFromNetwork()
      );
    }
  }

  public static async initialize(secret) {
    return new this().initialize(secret);
  }

  public static async named(name = "", dbName?: string) {
    return new this()._named(name, dbName);
  }

  generate(): Promise<this | Error> {
    return new Promise(() => {
      return this;
    });
  }
}

export class TestNetWatchWallet extends WatchWallet {
  static networkPrefix = CashAddressNetworkPrefix.testnet;
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.testnet);
  }
}

export class RegTestWatchWallet extends WatchWallet {
  static networkPrefix = CashAddressNetworkPrefix.regtest;
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.regtest);
  }
}
