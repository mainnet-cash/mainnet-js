import { CashAddressNetworkPrefix } from "@bitauth/libauth";
// GrpcClient is swapped out by webpack for a web module
import { GrpcClient } from "grpc-bchrpc-node";
import { NetworkEnum, NetworkType } from "./enum"


/**
 * A class to hold features used by all wallets
 * @class  BaseWallet
 */
export class BaseWallet {
  client?: GrpcClient;
  isTestnet?: boolean;
  name: string;
  networkPrefix: CashAddressNetworkPrefix;
  networkType: NetworkType;
  network: NetworkEnum;

  constructor(name = "", networkPrefix: CashAddressNetworkPrefix, url = "") {
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
          url = `${process.env.HOST_IP}:${process.env.GRPC_PORT}`;
          const cert = `${process.env.BCHD_BIN_DIRECTORY}/${process.env.RPC_CERT}`;
          const host = `${process.env.HOST}`;
          this.client = new GrpcClient({
            url: url,
            testnet: true,
            rootCertPath: cert,
            options: {
              "grpc.ssl_target_name_override": host,
              "grpc.default_authority": host,
              "grpc.max_receive_message_length": -1,
            },
          });
          break;
        case CashAddressNetworkPrefix.testnet:
          url = "https://bchd-testnet.greyh.at:18335";
          this.client = new GrpcClient({
            url: url,
            testnet: true,
            options: {
              "grpc.max_receive_message_length": -1,
            },
          });
          break;
      }
    } else {
      url = "https://bchd.greyh.at:8335";
      this.client = new GrpcClient({
        url: url,
        testnet: false,
        options: {
          "grpc.max_receive_message_length": -1,
        },
      });
    }
  }
}
