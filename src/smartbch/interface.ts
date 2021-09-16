import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { NetworkType, UnitEnum } from "../enum";

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
  usd?: number;
}

export type CancelWatchFn = () => Promise<void>;

export interface WaitForTransactionOptions {
  confirmations?: number;
  getTransactionInfo?: boolean;
  getBalance?: boolean;
  txHash?: string;
}

export interface WaitForTransactionResponse {
  transactionInfo?: ethers.providers.TransactionReceipt;
  balance?: BalanceResponse;
}

//#region Sep20
export interface Sep20GenesisOptions {
  name: string;
  ticker: string;
  initialAmount: BigNumber.Value;
  decimals: number;
  endBaton?: boolean;
  tokenReceiverAddress?: string;
  batonReceiverAddress?: string;
}

export interface Sep20TokenInfo {
  name: string;
  ticker: string;
  tokenId: string;
  decimals: number;
  totalSupply: BigNumber;
}

export interface Sep20TokenBalance {
  value: BigNumber;
  ticker: string;
  name: string;
  tokenId: string;
  decimals: number;
}

export interface Sep20GenesisResult {
  tokenId: string;
  balance: Sep20TokenBalance;
}

export interface Sep20SendResponse {
  txId: string;
  balance: Sep20TokenBalance;
  explorerUrl: string;
}

export interface Sep20MintOptions {
  value: BigNumber.Value;
  tokenId: string;
  tokenReceiverAddress?: string;
}

export interface Sep20MintResult {
  txId: string;
  balance: Sep20TokenBalance;
}

export interface Sep20SendRequest {
  address: string;
  value: BigNumber.Value;
  tokenId: string;
}
//#endregion Sep20

//#region Contract
export type Argument =
  | number
  | boolean
  | string
  | Uint8Array
  | ethers.BigNumberish;

export interface ContractRequestI {
  address: string;
  abi: ethers.ContractInterface;
  network: NetworkType;
}

export interface ContractResponseI {
  contractId: string;
  address: string;
}

export interface ContractInfoResponseI {
  contractId: string;
  address: string;
  abi: ethers.ContractInterface;
  script: string;
  parameters: Argument[];
}

export interface ContractFnRequestI {
  function: string;
  arguments?: Argument[];
  overrides?: ethers.CallOverrides;
}

export interface ContractFnResponseI {
  result?: any;
  txId?: string;
  receipt?: ethers.providers.TransactionReceipt;
}
//#endregion Contract
