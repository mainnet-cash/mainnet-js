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
};

export interface SlpTokenBalance {
  value: BigNumber;
  ticker: string;
  name: string;
  tokenId: string;
};

export interface SlpUtxoI extends UtxoI {
  value: BigNumber;
  decimals: number;
  ticker: string;
  tokenId: string;
}

export interface SlpSendRequest {
  cashaddr: string;
  value: BigNumber.Value;
  ticker: string;
  tokenId?: string;
};

export interface SlpTokenInfo {
  name: string;
  ticker: string;
  tokeinId: string;
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
  balances: SlpTokenBalance[];
}

export interface SlpSendResponse {
  txId: string;
  balances: SlpTokenBalance[];
}

export interface SlpMintResult {
  txId: string;
  balances: SlpTokenBalance[];
}
