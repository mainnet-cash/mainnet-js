// Unstable?
import { CashAddressNetworkPrefix } from "@bitauth/libauth";

// This is swapped out by webpack for the web module
import { GrpcClient } from "grpc-bchrpc-node";

export class SendRequest {
  address: string;
  amount: Amount;

  constructor({address, amount}:{address:string, amount:Amount}) {
    this.address = address;
    this.amount = new Amount(amount);
  }
}

class Amount {
  value: number;
  unit: UnitType.UnitEnum;
  constructor({value, unit}:{value: number, unit: UnitType.UnitEnum}) {
    this.value = value;
    this.unit = unit;
  }

  public inSatoshi(): number | Error {
    switch (this.unit) {
      case UnitType.UnitEnum.Satoshi:
        return Number(this.value);
      case UnitType.UnitEnum.Sat:
        return Number(this.value);
      case UnitType.UnitEnum.Sats:
        return Number(this.value);        
      case UnitType.UnitEnum.Satoshis:
        return Number(this.value);
      case UnitType.UnitEnum.Bch:
        return Number(this.value / 10e8);
      default:
        throw Error("Unit of value not defined");
    }
  }
}

export type NetworkType = "mainnet" | "testnet";

export namespace UnitType {
  export enum UnitEnum {
      Bch = <any> 'bch',
      Usd = <any> 'usd',
      Bit = <any> 'bit',
      Bits = <any> 'bits',
      Sat = <any> 'sat',
      Sats = <any> 'sats',
      Satoshi = <any> 'satoshi',
      Satoshis = <any> 'satoshis'
  }
}

export namespace WalletType {
  export enum TypeEnum {
      Wif = <any> 'wif',
      Hd = <any> 'hd'
  }
}


export namespace Network {
  export enum NetworkEnum {
      Mainnet = <any> 'mainnet',
      Testnet = <any> 'testnet',
      Regtest = <any> 'regtest',
      Simtest = <any> 'simtest'
  }
}

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
