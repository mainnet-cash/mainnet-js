import { TxI } from "../interface";
import {
  SlpGenesisOptions,
  SlpTokenBalance,
  SlpTokenInfo,
  SlpUtxoI,
} from "./interface";
import BigNumber from "bignumber.js";

export type SlpWatchTransactionCallback = (tx: any) => boolean | void;
export type SlpCancelWatchFn = () => void;
export type SlpWatchBalanceCallback = (
  balance: SlpTokenBalance[]
) => boolean | void;

export interface SlpProvider {
  // all utxos, including mint batons
  SlpUtxos(cashaddr: string): Promise<SlpUtxoI[]>;

  // look up the token information
  SlpTokenInfo(ticker: string, tokenId?: string): Promise<SlpGenesisOptions[]>;

  // safe-spendable token utxos, without baton
  SlpSpendableUtxos(
    cashaddr: string,
    ticker?: string,
    tokenId?: string
  ): Promise<SlpUtxoI[]>;

  // token mint baton utxos
  SlpBatonUtxos(
    cashaddr: string,
    ticker?: string,
    tokenId?: string
  ): Promise<SlpUtxoI[]>;

  // get all token balances
  SlpAddressTokenBalances(
    cashaddr: string,
    ticker?: string,
    tokenId?: string
  ): Promise<SlpTokenBalance[]>;

  // get all slp transactions of this address
  SlpAddressTransactionHistory(
    cashaddr: string,
    ticker?: string,
    tokenId?: string
  ): Promise<TxI[]>;

  // waits for next slp transaction to appear in mempool, code execution is halted
  SlpWaitForTransaction(
    cashaddr: string,
    ticker?: string,
    tokenId?: string
  ): Promise<any>;

  // waits for a certain slp token balance to be available in this wallet, code execution is halted
  SlpWaitForBalance(
    value: BigNumber.Value,
    cashaddr: string,
    ticker: string,
    tokenId?: string
  ): Promise<SlpTokenBalance>;

  // set's up a callback to be executed each time the token balance of the wallet is changed
  SlpWatchBalance(
    callback: SlpWatchBalanceCallback,
    cashaddr: string,
    ticker?: string,
    tokenId?: string
  ): SlpCancelWatchFn;

  // sets up a callback to be executed each time a new transaction associated with this wallet's address is entering the mempool
  SlpWatchTransactions(
    callback: SlpWatchTransactionCallback,
    cashaddr: string,
    ticker?: string,
    tokenId?: string
  ): SlpCancelWatchFn;
}

export function _convertBalanceBigNumbers(
  balances: SlpTokenBalance[]
): SlpTokenBalance[] {
  balances.forEach((val) => (val.amount = new BigNumber(val.amount)));
  return balances;
}

export function _convertUtxoBigNumbers(utxos: SlpUtxoI[]): SlpUtxoI[] {
  utxos.forEach((val) => (val.amount = new BigNumber(val.amount)));
  return utxos;
}

export function _convertSlpTokenInfo(
  tokenInfos: SlpTokenInfo[]
): SlpTokenInfo[] {
  tokenInfos.forEach((val) => {
    for (const key in val) {
      if (val[key] === null) {
        val[key] = "";
      }
    }
    val.initialAmount = new BigNumber(val.initialAmount);
  });

  return tokenInfos;
}
