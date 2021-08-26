import BigNumber from "bignumber.js";
import { UnitEnum } from "../enum";

export interface SendRequest {
  address: string;
  value: number;
  unit: UnitEnum;
}

export type SendRequestArray = Array<string | number | UnitEnum>;

export interface SendRequestOptionsI {
  queryBalance?: boolean;
  awaitTransactionPropagation?: boolean;
}

export interface SendResponse {
  txId: string;
  balance?: BalanceResponse;
  explorerUrl?: string;
}

export interface BalanceResponse {
  bch?: number;
  sat?: number;
  wei?: number;
  usd?: number;
}

export interface Erc20GenesisOptions {
  name: string;
  ticker: string;
  initialAmount: BigNumber.Value;
  decimals: number;
  endBaton?: boolean;
  tokenReceiverAddress?: string;
  batonReceiverAddress?: string;
}

export interface Erc20TokenInfo {
  name: string;
  ticker: string;
  tokenId: string;
  decimals: number;
  totalSupply: BigNumber;
}

export interface Erc20TokenBalance {
  value: BigNumber;
  ticker: string;
  name: string;
  tokenId: string;
  decimals: number;
}

export interface Erc20GenesisResult {
  tokenId: string;
  balance: Erc20TokenBalance;
}

export interface Erc20SendResponse {
  txId: string;
  balance: Erc20TokenBalance;
  explorerUrl: string;
}

export interface Erc20MintOptions {
  value: BigNumber.Value;
  tokenId: string;
  endBaton?: boolean;
  tokenReceiverAddress?: string;
}

export interface Erc20MintResult {
  txId: string;
  balance: Erc20TokenBalance;
}

export interface Erc20SendRequest {
  address: string;
  value: BigNumber.Value;
  tokenId: string;
}