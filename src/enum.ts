
// Here there are two network types, mainnet and all other networks
export enum NetworkType {
    Mainnet = "mainnet",
    Testnet = "testnet",
  }

  export enum NetworkEnum {
    Mainnet = <any>"mainnet",
    Testnet = <any>"testnet",
    Regtest = <any>"regtest",
    Simtest = <any>"simtest",
  }

  export const networkPrefixMap = {
    bitcoincash: "mainnet",
    bchtest: "testnet",
    bchreg: "regtest",
  };
  
  const literal = <L extends string>(l: L): L => l;

export const UnitEnum = {
  BCH: literal("bch"),
  USD: literal("usd"),
  BIT: literal("bit"),
  BITS: literal("bits"),
  SAT: literal("sat"),
  SATS: literal("sats"),
  SATOSHI: literal("satoshi"),
  SATOSHIS: literal("satoshis"),
};
export type UnitEnum = typeof UnitEnum[keyof typeof UnitEnum];
