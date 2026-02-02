import { CashAddressNetworkPrefix } from "@bitauth/libauth";

export enum NetworkType {
  Mainnet = "mainnet",
  Testnet = "testnet",
  Regtest = "regtest",
}

export enum NetworkEnum {
  Mainnet = <any>"mainnet",
  Testnet = <any>"testnet",
  Regtest = <any>"regtest",
}

export const networkPrefixMap = {
  bitcoincash: "mainnet",
  bchtest: "testnet",
  bchreg: "regtest",
};

export const prefixFromNetworkMap = {
  mainnet: CashAddressNetworkPrefix.mainnet,
  testnet: CashAddressNetworkPrefix.testnet,
  regtest: CashAddressNetworkPrefix.regtest,
};

const literal = <L extends string>(l: L): L => l;

export const UnitEnum = {
  BCH: literal("bch"),
  USD: literal("usd"),
  SAT: literal("sat"),
};
export type UnitEnum = typeof UnitEnum[keyof typeof UnitEnum];
