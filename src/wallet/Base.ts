import { CashAddressNetworkPrefix } from "@bitauth/libauth";
// GrpcClient is swapped out by webpack for a web module
import { GrpcClient } from "grpc-bchrpc-node";
import { bch } from "../chain";
import { BalanceResponse } from "../util/balanceObjectFromSatoshi";

export class SendRequest {
  cashaddr: string;
  amount: Amount;

  constructor({ cashaddr, amount }: { cashaddr: string; amount: Amount }) {
    this.cashaddr = cashaddr;
    this.amount = new Amount(amount);
  }
}

export class Utxo {
  "index"?: number;
  "amount": Amount;
  "utxoId": string;
  "transaction": string;
}

export class UtxoResponse {
  "utxos"?: Array<Utxo>;
}

export class Amount {
  value: number;
  unit: UnitEnum;
  constructor({ value, unit }: { value: number; unit: UnitEnum }) {
    this.value = value;
    this.unit = unit;
  }

  public inSatoshi(): BigInt | Error {
    switch (this.unit) {
      case UnitEnum.Satoshi:
        return BigInt(this.value);
      case UnitEnum.Sat:
        return BigInt(this.value);
      case UnitEnum.Sats:
        return BigInt(this.value);
      case UnitEnum.Satoshis:
        return BigInt(this.value);
      case UnitEnum.Bch:
        return BigInt(this.value * bch.subUnits);
      default:
        throw Error("Unit of value not defined");
    }
  }
}

export class SendMaxRequest {
  cashaddr: string;

  constructor({ cashaddr }) {
    this.cashaddr = cashaddr;
  }
}

export class SendResponse {
  transaction?: string;
  balance?: BalanceResponse;

  constructor({
    transaction,
    balance,
  }: {
    transaction?: string;
    balance?: any;
  }) {
    this.transaction = transaction;
    this.balance = new BalanceResponse(balance);
  }
}

export type NetworkType = "mainnet" | "testnet";

export enum UnitEnum {
  Bch = <any>"bch",
  Usd = <any>"usd",
  Bit = <any>"bit",
  Bits = <any>"bits",
  Sat = <any>"sat",
  Sats = <any>"sats",
  Satoshi = <any>"satoshi",
  Satoshis = <any>"satoshis",
}

export enum WalletTypeEnum {
  Wif = "wif",
  Hd = "hd",
}

export enum NetworkEnum {
  Mainnet = <any>"mainnet",
  Testnet = <any>"testnet",
  Regtest = <any>"regtest",
  Simtest = <any>"simtest",
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
  network: NetworkEnum;

  constructor(name = "", networkPrefix: CashAddressNetworkPrefix, url = "") {
    this.name = name;
    this.networkPrefix = networkPrefix;
    this.networkType =
      this.networkPrefix === CashAddressNetworkPrefix.mainnet
        ? "mainnet"
        : "testnet";
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
