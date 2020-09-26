import { WalletImportFormatType } from "@bitauth/libauth";

export interface PrivateKey {
  privateKey: Uint8Array;
  type: WalletImportFormatType;
}

// Weird setup to allow both Enum parameters, as well as literal strings
// https://stackoverflow.com/questions/51433319/typescript-constructor-accept-string-for-enum
const literal = <L extends string>(l: L): L => l;
export const Network = {
  MAINNET: literal('mainnet'),
  TESTNET: literal('testnet'),
  REGTEST: literal('regtest'),
};
export type Network = (typeof Network)[keyof typeof Network];

export interface Utxo {
  txid: string;
  vout: number;
  satoshis: number;
  height?: number;
  coinbase?: boolean
}