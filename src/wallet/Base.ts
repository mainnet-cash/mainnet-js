
// Unstable?
import {
  CashAddressNetworkPrefix,
} from "@bitauth/libauth";

// This is swapped out by webpack for the web module
import { GrpcClient } from "grpc-bchrpc-node";

export class SendRequest {
  address: string;
  amount: Amount;

  constructor(SerializedSendRequest: any) {
    this.address = SerializedSendRequest[0];
    this.amount = new Amount(SerializedSendRequest[1]);
  }
}

class Amount {
  amount: number;
  unit: UnitType;
  constructor(SerializedAmount: any) {
    this.amount = SerializedAmount[0];
    this.unit = SerializedAmount[1];
  }

  public inSatoshi(): number | Error {
    switch (this.unit) {
      case "satoshi":
        return Number(this.amount);
      case "coin":
        return Number(this.amount / 10e8);
      default:
        throw Error("Unit of value not defined");
    }
  }
}

export type NetworkType = "mainnet" | "testnet";
export type UnitType = "coin" | "bits" | "satoshi";
export type WalletType = "wif" | "hd";

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

  constructor(name = "", networkPrefix: CashAddressNetworkPrefix, url = "") {
    this.name = name;
    this.networkPrefix = networkPrefix;
    this.networkType =
      this.networkPrefix === CashAddressNetworkPrefix.mainnet
        ? "mainnet"
        : "testnet";
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
          url = 'https://bchd-testnet.greyh.at:18335'
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
      url = 'https://bchd.greyh.at:8335'
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

