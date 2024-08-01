import { TokenI } from "../interface.js";

export interface InOutput {
  address: string;
  value: number;
  token?: TokenI;
}

export interface TransactionHistoryItem {
  inputs: InOutput[];
  outputs: InOutput[];
  blockHeight: number;
  timestamp?: number;
  hash: string;
  size: number;
  fee: number;
  balance: number;
  valueChange: number;
  tokenAmountChanges: {
    tokenId: string;
    amount: bigint;
    nftAmount: bigint;
  }[];
}
