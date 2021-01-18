import { Network, TxI } from "../interface";
import {
  SlpDbResponse,
  SlpTokenBalance,
  SlpTokenInfo,
  SlpUtxoI,
} from "./interface";
import {
  SlpAllUtxosTemplate,
  SlpAddressTransactionHistoryTemplate,
  SlpWaitForTransactionTemplate,
  SlpBatonUtxosTemplate,
  SlpSpendableUtxosTemplate,
  SlpTokenInfoTemplate,
  SlpAllTokenBalancesTemplate,
  SlpTokenBalanceTemplate,
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
  _emptyTokenBalance,
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
  async SlpTokenInfo(tokenId: string): Promise<SlpTokenInfo | undefined> {
    const infos = (await this.SlpDbQuery(SlpTokenInfoTemplate(tokenId)))
      .t as SlpTokenInfo[];
    return _convertSlpTokenInfo(infos[0]);
  }

  // safe-spendable token utxos, without baton
  async SlpSpendableUtxos(
    cashaddr: string,
    tokenId?: string
  ): Promise<SlpUtxoI[]> {
    return _convertUtxoBigNumbers(
      (await this.SlpDbQuery(SlpSpendableUtxosTemplate(cashaddr, tokenId)))
        .g as SlpUtxoI[]
    );
  }

  // token mint baton utxos
  async SlpBatonUtxos(cashaddr: string, tokenId?: string): Promise<SlpUtxoI[]> {
    return _convertUtxoBigNumbers(
      (await this.SlpDbQuery(SlpBatonUtxosTemplate(cashaddr, tokenId)))
        .g as SlpUtxoI[]
    );
  }

  // get all token balances
  async SlpAllTokenBalances(cashaddr: string): Promise<SlpTokenBalance[]> {
    return _convertBalanceBigNumbers(
      (await this.SlpDbQuery(SlpAllTokenBalancesTemplate(cashaddr)))
        .g as SlpTokenBalance[]
    );
  }

  // get specific token balance
  async SlpTokenBalance(
    cashaddr: string,
    tokenId: string
  ): Promise<SlpTokenBalance> {
    const balances = _convertBalanceBigNumbers(
      (await this.SlpDbQuery(SlpTokenBalanceTemplate(cashaddr, tokenId)))
        .g as SlpTokenBalance[]
    );

    return balances[0] || _emptyTokenBalance(tokenId);
  }

  // get all slp transactions of this address
  async SlpAddressTransactionHistory(
    cashaddr: string,
    tokenId?: string,
    limit: number = 100,
    skip: number = 0
  ): Promise<TxI[]> {
    const response = await this.SlpDbQuery(
      SlpAddressTransactionHistoryTemplate(cashaddr, tokenId, limit, skip)
    );
    return response.c.concat(response.u) as TxI[];
  }

  // waits for next slp transaction to appear in mempool, code execution is halted
  async SlpWaitForTransaction(
    cashaddr: string,
    tokenId?: string
  ): Promise<any> {
    return new Promise(async (resolve) => {
      this.SlpWatchTransactions(
        (data) => {
          resolve(data);
          return true;
        },
        cashaddr,
        tokenId
      );
    });
  }

  // waits for a certain slp token balance to be available in this wallet, code execution is halted
  async SlpWaitForBalance(
    value: BigNumber.Value,
    cashaddr: string,
    tokenId: string
  ): Promise<SlpTokenBalance> {
    return new Promise((resolve) =>
      this.SlpWatchBalance(
        (balance: SlpTokenBalance) => {
          if (balance.value.isGreaterThanOrEqualTo(new BigNumber(value))) {
            resolve(balance);
            return true;
          }

          return false;
        },
        cashaddr,
        tokenId
      )
    );
  }

  // set's up a callback to be executed each time the token balance of the wallet is changed
  SlpWatchBalance(
    callback: SlpWatchBalanceCallback,
    cashaddr: string,
    tokenId: string
  ): SlpCancelWatchFn {
    const cancelFn = this.SlpWatchTransactions(
      () => {
        this.SlpTokenBalance(cashaddr, tokenId).then((balance) => {
          if (!!callback(balance)) cancelFn();
        });
      },
      cashaddr,
      tokenId
    );
    return cancelFn;
  }

  // sets up a callback to be executed each time a new transaction associated with this wallet's address is entering the mempool
  SlpWatchTransactions(
    callback: SlpWatchTransactionCallback,
    cashaddr: string,
    tokenId?: string
  ): SlpCancelWatchFn {
    const eventSource: EventSource = this.SlpSocketEventSource(
      SlpWaitForTransactionTemplate(cashaddr, tokenId)
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
