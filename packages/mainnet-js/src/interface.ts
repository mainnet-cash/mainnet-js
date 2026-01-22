import { WalletImportFormatType } from "@bitauth/libauth";

export interface PrivateKeyI {
  privateKey: Uint8Array;
  type: WalletImportFormatType;
}

// Weird setup to allow both Enum parameters, as well as literal strings
// https://stackoverflow.com/questions/51433319/typescript-constructor-accept-string-for-enum
const literal = <L extends string>(l: L): L => l;
export const Network = {
  MAINNET: literal("mainnet"),
  TESTNET: literal("testnet"),
  REGTEST: literal("regtest"),
};
export type Network = typeof Network[keyof typeof Network];

export interface Utxo {
  txid: string;
  vout: number;
  satoshis: bigint;
  height?: number;
  coinbase?: boolean;
  token?: TokenI;
  address: string;
}

export interface UtxoId {
  txid: string;
  vout: number;
}

export interface ElectrumBalanceI {
  confirmed: number;
  unconfirmed: number;
}

export interface TxI {
  tx_hash: string;
  height: number;
  fee?: number;
}

export interface HexHeaderI {
  height: number;
  hex: string;
}

export interface HeaderI {
  version: number;
  previousBlockHash: string;
  merkleRoot: string;
  timestamp: number;
  bits: number;
  nonce: number;
  height: number;
}

export interface TokenI {
  amount: bigint;
  category: string;
  nft?: {
    capability: NFTCapability;
    commitment: string;
  };
}

export const NFTCapability = {
  none: literal("none"),
  mutable: literal("mutable"),
  minting: literal("minting"),
};
export type NFTCapability = typeof NFTCapability[keyof typeof NFTCapability];
