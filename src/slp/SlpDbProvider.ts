import { Network, TxI } from "../interface";
import {
  SlpDbResponse,
  SlpDbTx,
  SlpTokenBalance,
  SlpTokenInfo,
  SlpTxI,
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
  SlpAllOutpointsTemplate,
} from "./SlpDbTemplates";
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

import EventSource from "../../polyfill/eventsource";

export class SlpDbProvider implements SlpProvider {
  public static servers = {
    mainnet: {
      dataSource: "https://slpdb.fountainhead.cash",
      eventSource: "https://slpsocket.fountainhead.cash",
    },
    testnet: {
      dataSource: "https://slpdb-testnet.fountainhead.cash",
      eventSource: "https://slpsocket-testnet.fountainhead.cash",
    },
    regtest: {
      dataSource: "http://localhost:12300",
      eventSource: "http://localhost:12301",
    },
  };

  public caching: boolean = false;
  constructor(public network: Network = Network.MAINNET) {}

  // all oupoints, including mint batons
  async SlpOutpoints(slpaddr: string): Promise<String[]> {
    return (await this.SlpDbQuery(SlpAllOutpointsTemplate(slpaddr)))
      .g as String[];
  }

  // all utxos, including mint batons
  async SlpUtxos(slpaddr: string): Promise<SlpUtxoI[]> {
    return _convertUtxoBigNumbers(
      (await this.SlpDbQuery(SlpAllUtxosTemplate(slpaddr))).g as SlpUtxoI[]
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
    slpaddr: string,
    tokenId?: string
  ): Promise<SlpUtxoI[]> {
    return _convertUtxoBigNumbers(
      (await this.SlpDbQuery(SlpSpendableUtxosTemplate(slpaddr, tokenId)))
        .g as SlpUtxoI[]
    );
  }

  // token mint baton utxos
  async SlpBatonUtxos(slpaddr: string, tokenId?: string): Promise<SlpUtxoI[]> {
    return _convertUtxoBigNumbers(
      (await this.SlpDbQuery(SlpBatonUtxosTemplate(slpaddr, tokenId)))
        .g as SlpUtxoI[]
    );
  }

  // get all token balances
  async SlpAllTokenBalances(slpaddr: string): Promise<SlpTokenBalance[]> {
    return _convertBalanceBigNumbers(
      (await this.SlpDbQuery(SlpAllTokenBalancesTemplate(slpaddr)))
        .g as SlpTokenBalance[]
    );
  }

  // get specific token balance
  async SlpTokenBalance(
    slpaddr: string,
    tokenId: string
  ): Promise<SlpTokenBalance> {
    const balances = _convertBalanceBigNumbers(
      (await this.SlpDbQuery(SlpTokenBalanceTemplate(slpaddr, tokenId)))
        .g as SlpTokenBalance[]
    );

    return balances[0] || _emptyTokenBalance(tokenId);
  }

  // get all slp transactions of this address
  async SlpAddressTransactionHistory(
    slpaddr: string,
    tokenId?: string,
    limit: number = 100,
    skip: number = 0
  ): Promise<SlpTxI[]> {
    const response = await this.SlpDbQuery(
      SlpAddressTransactionHistoryTemplate(slpaddr, tokenId, limit, skip)
    );
    return response.c.concat(response.u) as SlpTxI[];
  }

  // waits for next slp transaction to appear in mempool, code execution is halted
  async SlpWaitForTransaction(
    slpaddr: string,
    tokenId?: string
  ): Promise<SlpTxI> {
    return new Promise(async (resolve) => {
      const cancelFn = this.SlpWatchTransactions(
        async (tx: SlpTxI) => {
          cancelFn();
          resolve(tx);
        },
        slpaddr,
        tokenId
      );
    });
  }

  // waits for a certain slp token balance to be available in this wallet, code execution is halted
  async SlpWaitForBalance(
    value: BigNumber.Value,
    slpaddr: string,
    tokenId: string
  ): Promise<SlpTokenBalance> {
    return new Promise((resolve) =>
      this.SlpWatchBalance(
        (balance: SlpTokenBalance) => {
          if (balance.value.isGreaterThanOrEqualTo(new BigNumber(value))) {
            resolve(balance);
          }
        },
        slpaddr,
        tokenId
      )
    );
  }

  // set's up a callback to be executed each time the token balance of the wallet is changed
  SlpWatchBalance(
    callback: SlpWatchBalanceCallback,
    slpaddr: string,
    tokenId: string
  ): SlpCancelWatchFn {
    const cancelFn = this.SlpWatchTransactions(
      async () => {
        const balance = await this.SlpTokenBalance(slpaddr, tokenId);
        callback(balance);
      },
      slpaddr,
      tokenId
    );
    return cancelFn;
  }

  // sets up a callback to be executed each time a new transaction associated with this wallet's address is entering the mempool
  SlpWatchTransactions(
    callback: SlpWatchTransactionCallback,
    slpaddr: string,
    tokenId?: string
  ): SlpCancelWatchFn {
    const eventSource: EventSource = this.SlpSocketEventSource(
      SlpWaitForTransactionTemplate(slpaddr, tokenId)
    );
    const cancelFn: SlpCancelWatchFn = () => {
      eventSource.close();
    };

    eventSource.addEventListener(
      "message",
      async (txEvent: MessageEvent) => {
        const data = JSON.parse(txEvent.data);
        if (data.data && data.data.length) {
          const tx: SlpTxI = {
            tx_hash: data.data[0].tx.h,
            height: 0,
            details: data.data[0] as SlpDbTx,
          };
          callback(tx);
        }
      },
      false
    );

    return cancelFn;
  }

  public SlpDbQuery(queryObject: any): Promise<SlpDbResponse> {
    if (this.caching) {
      axiosInstance.defaults.headers = {};
    } else {
      axiosInstance.defaults.headers = noCacheHeaders;
    }

    return new Promise((resolve, reject) => {
      const url = `${
        SlpDbProvider.servers[this.network].dataSource
      }/q/${B64QueryString(queryObject)}`;
      fetch_retry(url).then((response: any) => {
        if (response.hasOwnProperty("error")) {
          reject(new Error(response["error"]));
        }
        resolve(response.data as SlpDbResponse);
      });
    });
  }

  public SlpSocketEventSource(queryObject: any): EventSource {
    const url = `${
      SlpDbProvider.servers[this.network].eventSource
    }/s/${B64QueryString(queryObject)}`;
    return new EventSource(url);
  }
}

const noCacheHeaders = {
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  Expires: "0",
};

const axiosInstance = axios.create({
  headers: noCacheHeaders,
});

const fetch_retry = (url, options = {}, n = 5) =>
  axiosInstance.get(url, options).catch(function (error) {
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
