import { CashAddressNetworkPrefix } from "@bitauth/libauth";
// GrpcClient is swapped out by webpack for a web module
import {
  MainnetProvider,
  TestnetProvider,
  RegtestProvider,
} from "../network/default";
import { NetworkProvider } from "../network";
import { NetworkEnum, NetworkType } from "./enum";
import { browserNotSupported } from "../util/browserNotSupported";
/**
 * A class to hold features used by all wallets
 * @class  BaseWallet
 */
export class BaseWallet {
  provider?: NetworkProvider;
  isTestnet?: boolean;
  name: string;
  networkPrefix: CashAddressNetworkPrefix;
  networkType: NetworkType;
  network: NetworkEnum;

  constructor(name = "", networkPrefix: CashAddressNetworkPrefix) {
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
        throw Error("could not map cashaddr prefix to network");
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
}
