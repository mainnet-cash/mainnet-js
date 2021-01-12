import { Network, TxI } from "../interface";
import {
  SlpDbResponse,
  SlpGenesisOptions,
  SlpTokenBalance,
  SlpTokenInfo,
  SlpUtxoI,
} from "./interface";
import {
  SlpAllUtxosTemplate,
  SlpAddressTokenBalancesTemplate,
  SlpAddressTransactionHistoryTemplate,
  SlpWaitForTransactionTemplate,
  SlpBatonUtxosTemplate,
  SlpSpendableUtxosTemplate,
  SlpTokenInfoTemplate,
} from "./SlpDbTemplates";
import EventSource from "eventsource";
import BigNumber from "bignumber.js";
import {
  SlpCancelWatchFn,
  SlpProvider,
  SlpWatchBalanceCallback,
  SlpWatchTransactionCallback,
  _convertBalanceBigNumbers,
  _convertSlpTokenInfo,
  _convertUtxoBigNumbers,
} from "./SlpProvider";
import axios from "axios";
import { btoa } from "../util/base64";

const servers = {
  mainnet: {
    slpdb: "https://slpdb.fountainhead.cash",
    slpsockserve: "https://slpsocket.fountainhead.cash",
  },
  testnet: {
    slpdb: "https://slpdb-testnet.fountainhead.cash",
    slpsockserve: "https://slpsocket-testnet.fountainhead.cash",
  },
  regtest: {
    slpdb: "http://localhost:12300",
    slpsockserve: "http://localhost:12301",
  },
};

export class SlpDbProvider implements SlpProvider {
  constructor(public network: Network = Network.MAINNET) {}

  // all utxos, including mint batons
  async SlpUtxos(cashaddr: string): Promise<SlpUtxoI[]> {
    return _convertUtxoBigNumbers(
      (await this.SlpDbQuery(SlpAllUtxosTemplate(cashaddr))).g as SlpUtxoI[]
    );
  }

  // look up the token information
  async SlpTokenInfo(
    ticker: string,
    tokenId?: string
  ): Promise<SlpTokenInfo[]> {
    return _convertSlpTokenInfo(
      (await this.SlpDbQuery(SlpTokenInfoTemplate(ticker, tokenId)))
        .t as SlpTokenInfo[]
    );
  }

  // safe-spendable token utxos, without baton
  async SlpSpendableUtxos(
    cashaddr: string,
    ticker?: string,
    tokenId?: string
  ): Promise<SlpUtxoI[]> {
    return _convertUtxoBigNumbers(
      (
        await this.SlpDbQuery(
          SlpSpendableUtxosTemplate(cashaddr, ticker, tokenId)
        )
      ).g as SlpUtxoI[]
    );
  }

  // token mint baton utxos
  async SlpBatonUtxos(
    cashaddr: string,
    ticker?: string,
    tokenId?: string
  ): Promise<SlpUtxoI[]> {
    return _convertUtxoBigNumbers(
      (await this.SlpDbQuery(SlpBatonUtxosTemplate(cashaddr, ticker, tokenId)))
        .g as SlpUtxoI[]
    );
  }

  // get all token balances
  async SlpAddressTokenBalances(
    cashaddr: string,
    ticker?: string,
    tokenId?: string
  ): Promise<SlpTokenBalance[]> {
    return _convertBalanceBigNumbers(
      (
        await this.SlpDbQuery(
          SlpAddressTokenBalancesTemplate(cashaddr, ticker, tokenId)
        )
      ).g as SlpTokenBalance[]
    );
  }

  // get all slp transactions of this address
  async SlpAddressTransactionHistory(
    cashaddr: string,
    ticker?: string,
    tokenId?: string
  ): Promise<TxI[]> {
    const response = await this.SlpDbQuery(
      SlpAddressTransactionHistoryTemplate(cashaddr, ticker, tokenId)
    );
    return response.c.concat(response.u) as TxI[];
  }

  // waits for next slp transaction to appear in mempool, code execution is halted
  async SlpWaitForTransaction(
    cashaddr: string,
    ticker?: string,
    tokenId?: string
  ): Promise<any> {
    return new Promise(async (resolve) => {
      this.SlpWatchTransactions(
        (data) => {
          resolve(data);
          return true;
        },
        cashaddr,
        ticker,
        tokenId
      );
    });
  }

  // waits for a certain slp token balance to be available in this wallet, code execution is halted
  async SlpWaitForBalance(
    value: BigNumber.Value,
    cashaddr: string,
    ticker: string,
    tokenId?: string
  ): Promise<SlpTokenBalance> {
    return new Promise((resolve) =>
      this.SlpWatchBalance(
        (balance: SlpTokenBalance[]) => {
          let bal = balance[0];
          if (bal.amount.isGreaterThanOrEqualTo(new BigNumber(value))) {
            resolve(bal);
            return true;
          }

          return false;
        },
        cashaddr,
        ticker,
        tokenId
      )
    );
  }

  // set's up a callback to be executed each time the token balance of the wallet is changed
  SlpWatchBalance(
    callback: SlpWatchBalanceCallback,
    cashaddr: string,
    ticker?: string,
    tokenId?: string
  ): SlpCancelWatchFn {
    const cancelFn = this.SlpWatchTransactions(
      () => {
        this.SlpAddressTokenBalances(cashaddr, ticker, tokenId).then(
          (balance) => {
            if (!!callback(balance)) cancelFn();
          }
        );
      },
      cashaddr,
      ticker,
      tokenId
    );
    return cancelFn;
  }

  // sets up a callback to be executed each time a new transaction associated with this wallet's address is entering the mempool
  SlpWatchTransactions(
    callback: SlpWatchTransactionCallback,
    cashaddr: string,
    ticker?: string,
    tokenId?: string
  ): SlpCancelWatchFn {
    const eventSource: EventSource = this.SlpSocketEventSource(
      SlpWaitForTransactionTemplate(cashaddr, ticker, tokenId)
    );
    const cancelFn: SlpCancelWatchFn = () => {
      eventSource.close();
    };

    eventSource.addEventListener(
      "message",
      (txEvent: MessageEvent) => {
        const data = JSON.parse(txEvent.data);
        if (data.data && data.data.length) {
          if (!!callback(data.data[0])) {
            cancelFn();
          }
        }
      },
      false
    );

    return cancelFn;
  }

  private SlpDbQuery(queryObject: any): Promise<SlpDbResponse> {
    return new Promise((resolve, reject) => {
      const url = `${servers[this.network].slpdb}/q/${B64QueryString(
        queryObject
      )}`;
      fetch_retry(url).then((response: any) => {
        if (response.hasOwnProperty("error")) {
          reject(new Error(response["error"]));
        }
        resolve(response.data as SlpDbResponse);
      });
    });
  }

  private SlpSocketEventSource(queryObject: any): EventSource {
    const url = `${servers[this.network].slpsockserve}/s/${B64QueryString(
      queryObject
    )}`;
    return new EventSource(url);
  }
}

const fetch_retry = (url, options = {}, n = 5) =>
  axios.get(url, options).catch(function (error) {
    if (n === 0) {
      throw error;
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve(fetch_retry(url, options, n - 1)), 1000);
    });
  });

const B64QueryString = function (queryObject): string {
  if (!queryObject || !Object.keys(queryObject).length) {
    throw new Error("Empty SLPDB query");
  }
  return btoa(JSON.stringify(queryObject));
};
