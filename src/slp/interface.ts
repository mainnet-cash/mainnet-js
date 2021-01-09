import BigNumber from "bignumber.js";
import { UtxoI } from "../interface";
import { BalanceResponse } from "../util/balanceObjectFromSatoshi";

export type SlpDbResponse = {
  t: any[];
  u: any[];
  c: any[];
  g: any[];
  a: any[];
  x: any[];
  s: any[];
};

export type SlpTokenBalance = {
  amount: BigNumber;
  ticker: string;
  name: string;
  tokenId: string;
};

export interface SlpUtxoI extends UtxoI {
  amount: BigNumber;
  decimals: number;
  ticker: string;
  tokenId: string;
}

export type SlpSendRequest = {
  cashaddr: string;
  value: BigNumber.Value;
  ticker: string;
  tokenId?: string;
  // burnAmount: number | undefined;
};

export interface SlpGenesisOptions {
  name: string;
  ticker: string;
  initialAmount: BigNumber.Value;
  decimalPlaces: number;
  documentUrl?: string;
  documentHash?: string;
  endBaton?: boolean;
}

export interface SlpGenesisResult {
  tokenId: string;
  balances: SlpTokenBalance[];
}

export interface SlpSendResult {
  txId: string;
  balances: SlpTokenBalance[];
}

export interface SlpMintResult {
  txId: string;
  balances: SlpTokenBalance[];
}
