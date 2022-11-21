import {
  SlpTokenBalance,
  SlpTokenInfo,
  SlpTxI,
  SlpUtxoI,
} from "./interface.js";
import BigNumber from "bignumber.js";

export type SlpWatchTransactionCallback = (tx: SlpTxI) => void;
export type SlpCancelWatchFn = () => Promise<void>;
export type SlpWatchBalanceCallback = (balance: SlpTokenBalance) => void;

export interface SlpProvider {
  // all oupoints, including mint batons
  SlpOutpoints(slpaddr: string): Promise<String[]>;

  // all utxos, including mint batons
  SlpUtxos(slpaddr: string): Promise<SlpUtxoI[]>;

  // look up the token information
  SlpTokenInfo(tokenId: string): Promise<SlpTokenInfo | undefined>;

  // safe-spendable token utxos, without baton
  SlpSpendableUtxos(slpaddr: string, tokenId?: string): Promise<SlpUtxoI[]>;

  // token mint baton utxos
  SlpBatonUtxos(slpaddr: string, tokenId?: string): Promise<SlpUtxoI[]>;

  // get all token balances
  SlpAllTokenBalances(slpaddr: string): Promise<SlpTokenBalance[]>;

  // get specific token balance
  SlpTokenBalance(slpaddr: string, tokenId: string): Promise<SlpTokenBalance>;

  // get all slp transactions of this address
  SlpAddressTransactionHistory(
    slpaddr: string,
    tokenId?: string
  ): Promise<SlpTxI[]>;

  // waits for next slp transaction to appear in mempool, code execution is halted
  SlpWaitForTransaction(slpaddr: string, tokenId?: string): Promise<SlpTxI>;

  // waits for a certain slp token balance to be available in this wallet, code execution is halted
  SlpWaitForBalance(
    value: BigNumber.Value,
    slpaddr: string,
    tokenId: string
  ): Promise<SlpTokenBalance>;

  // set's up a callback to be executed each time the token balance of the wallet is changed
  SlpWatchBalance(
    callback: SlpWatchBalanceCallback,
    slpaddr: string,
    tokenId: string
  ): SlpCancelWatchFn;

  // sets up a callback to be executed each time a new transaction associated with this wallet's address is entering the mempool
  SlpWatchTransactions(
    callback: SlpWatchTransactionCallback,
    slpaddr?: string,
    tokenId?: string
  ): SlpCancelWatchFn;
}

export function _convertBalanceBigNumbers(
  balances: SlpTokenBalance[]
): SlpTokenBalance[] {
  balances.forEach((val) => (val.value = new BigNumber(val.value)));
  return balances;
}

export function _convertUtxoBigNumbers(utxos: SlpUtxoI[]): SlpUtxoI[] {
  utxos.forEach((val) => (val.value = new BigNumber(val.value)));
  return utxos;
}

export function _convertSlpTokenInfo(
  tokenInfo: SlpTokenInfo | undefined
): SlpTokenInfo | undefined {
  if (!tokenInfo) return tokenInfo;

  for (const key in tokenInfo) {
    if (tokenInfo[key] === null) {
      tokenInfo[key] = "";
    }
  }
  tokenInfo.initialAmount = new BigNumber(tokenInfo.initialAmount);

  return tokenInfo;
}

export function _emptyTokenBalance(tokenId: string): SlpTokenBalance {
  return {
    value: new BigNumber(0),
    ticker: "",
    name: "",
    tokenId: tokenId,
  } as SlpTokenBalance;
}
