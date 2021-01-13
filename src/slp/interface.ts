import BigNumber from "bignumber.js";
import { UtxoI } from "../interface";
import { BalanceResponse } from "../util/balanceObjectFromSatoshi";

export interface SlpDbResponse {
  t: any[];
  u: any[];
  c: any[];
  g: any[];
  a: any[];
  x: any[];
  s: any[];
}

export interface SlpTokenBalance {
  value: BigNumber;
  ticker: string;
  name: string;
  tokenId: string;
}

export interface SlpUtxoI extends UtxoI {
  value: BigNumber;
  decimals: number;
  ticker: string;
  tokenId: string;
}

export interface SlpFormattedUtxo {
  ticker: string,
  tokenId: string,
  value: string,
  satoshis: number,
  decimals: number
  txId: string,
  index: number,
  utxoId: string
}

export interface SlpSendRequest {
  cashaddr: string;
  value: BigNumber.Value;
  tokenId: string;
}

export interface SlpTokenInfo {
  name: string;
  ticker: string;
  tokenId: string;
  initialAmount: BigNumber.Value;
  decimals: number;
  documentUrl?: string;
  documentHash?: string;
}

export interface SlpGenesisOptions {
  name: string;
  ticker: string;
  initialAmount: BigNumber.Value;
  decimals: number;
  documentUrl?: string;
  documentHash?: string;
  endBaton?: boolean;
}

export interface SlpGenesisResult {
  tokenId: string;
  balance: SlpTokenBalance;
}

export interface SlpSendResponse {
  txId: string;
  balance: SlpTokenBalance;
}

export interface SlpMintResult {
  txId: string;
  balance: SlpTokenBalance;
}
