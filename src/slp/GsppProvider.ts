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
import BigNumber from "bignumber.js";
import {
  SlpCancelWatchFn,
  SlpProvider,
  SlpWatchBalanceCallback,
  SlpWatchTransactionCallback,
  _emptyTokenBalance,
} from "./SlpProvider";
import axios from "axios";
import { btoa } from "../util/base64";

const cashaddrjs = require('cashaddrjs');

import EventSource from "../../polyfill/eventsource";
import { toCashAddress } from "../util/bchaddr";

const servers = {
  mainnet: {
    gspp: "https://gs.fountainhead.cash",
    slpsockserve: "https://slpsocket.fountainhead.cash",
  },
  testnet: {
    gspp: "https://gs-testnet.fountainhead.cash",
    slpsockserve: "https://slpsocket-testnet.fountainhead.cash",
  },
  regtest: {
    gspp: "http://localhost:8082",
    slpsockserve: "http://localhost:12301",
  },
};

export class GsppProvider implements SlpProvider {
  public caching: boolean = false;
  constructor(public network: Network = Network.MAINNET) {}

  // all utxos, including mint batons
  async SlpUtxos(slpaddr: string): Promise<SlpUtxoI[]> {
    const pubkeyBase64 = addressToScriptpubkey(slpaddr);
    const response = (await this.GsppQuery({"scriptpubkey": pubkeyBase64}, "v1/graphsearch/slputxos")).utxos as SlpUtxoI[];

    if (!response) {
      return [];
    }

    return _convertUtxoBigNumbers(response);
  }

  // safe-spendable token utxos, without baton
  async SlpSpendableUtxos(
    slpaddr: string,
    tokenId?: string
  ): Promise<SlpUtxoI[]> {
    return (await this.SlpUtxos(slpaddr)).filter(val => val.isBaton === false && (tokenId ? val.tokenId === tokenId : true));
  }

  // token mint baton utxos
  async SlpBatonUtxos(slpaddr: string, tokenId?: string): Promise<SlpUtxoI[]> {
    return (await this.SlpUtxos(slpaddr)).filter(val => val.isBaton === true && (tokenId ? val.tokenId === tokenId : true));
  }

  // look up the token information
  async SlpTokenInfo(tokenId: string): Promise<SlpTokenInfo | undefined> {
    const info = (await this.GsppQuery({"tokenId": tokenId}, "v1/graphsearch/slptokeninfo")) as SlpTokenInfo;
    return _convertSlpTokenInfo(info);
  }

  // get all token balances
  async SlpAllTokenBalances(slpaddr: string): Promise<SlpTokenBalance[]> {
    const pubkeyBase64 = addressToScriptpubkey(slpaddr);

    return _convertBalanceBigNumbers(
      ((await this.GsppQuery({"scriptpubkey": pubkeyBase64}, "v1/graphsearch/slpalltokenbalances")).balances || []) as SlpTokenBalance[]
    );
  }

  // get specific token balance
  async SlpTokenBalance(
    slpaddr: string,
    tokenId: string
  ): Promise<SlpTokenBalance> {
    const pubkeyBase64 = addressToScriptpubkey(slpaddr);
    const response = await this.GsppQuery({"scriptpubkey": pubkeyBase64, "tokenId": tokenId}, "v1/graphsearch/slptokenbalance");
    if (!response) {
      return _emptyTokenBalance(tokenId);
    }

    const balances = _convertBalanceBigNumbers([response]);
    if (balances[0].value.isZero()) {
      return _emptyTokenBalance(tokenId);
    }
    return balances[0];
  }

  // get all slp transactions of this address
  async SlpAddressTransactionHistory(
    slpaddr: string,
    tokenId?: string,
    limit: number = 100,
    skip: number = 0
  ): Promise<TxI[]> {
    const response = await this.GsppQuery(
      SlpAddressTransactionHistoryTemplate(slpaddr, tokenId, limit, skip)
    );
    return response.c.concat(response.u) as TxI[];
  }

  // waits for next slp transaction to appear in mempool, code execution is halted
  async SlpWaitForTransaction(slpaddr: string, tokenId?: string): Promise<any> {
    return new Promise(async (resolve) => {
      this.SlpWatchTransactions(
        (data) => {
          resolve(data);
          return true;
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
            return true;
          }

          return false;
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
      () => {
        this.SlpTokenBalance(slpaddr, tokenId).then((balance) => {
          if (!!callback(balance)) cancelFn();
        });
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

  public GsppQuery(queryObject: any, endpoint?: string): Promise<any> {
    if (this.caching) {
      axiosInstance.defaults.headers = {};
    } else {
      axiosInstance.defaults.headers = noCacheHeaders;
    }

    console.log(queryObject, endpoint);

    return new Promise((resolve) => {
      const url = `${servers[this.network].gspp}/${endpoint}`;
      fetch_retry(url, queryObject).then((response: any) => {
        resolve(response.data);
      }).catch(error => {
        console.trace(JSON.stringify(error.response.data, null, 2));
        // reject(new Error(error.response.data));
        resolve(undefined);
      });
    });
  }

  public SlpSocketEventSource(queryObject: any): EventSource {
    const url = `${servers[this.network].slpsockserve}/s/${B64QueryString(
      queryObject
    )}`;
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

const fetch_retry = (url, data = {}, n = 1) =>
  axiosInstance.post(url, data).catch(function (error) {
    if (n === 0) {
      throw error;
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve(fetch_retry(url, data, n - 1)), 1000);
    });
  });

const B64QueryString = function (queryObject): string {
  if (!queryObject || !Object.keys(queryObject).length) {
    throw new Error("Empty SLPDB query");
  }
  return btoa(JSON.stringify(queryObject));
};

const addressToScriptpubkey = (address) => {
  const x = cashaddrjs.decode(toCashAddress(address));
  return Buffer.from(
      (x.type === 'P2PKH')
    ? [0x76, 0xA9, x.hash.length].concat(...x.hash, [0x88, 0xAC])
    : (x.type === 'P2PK')
    ? [0xAC, x.hash.length].concat(...x.hash, [0x87])
    : [0xA9, x.hash.length].concat(...x.hash, [0x87]) // assume p2sh
  ).toString('base64');
};

export function _convertBalanceBigNumbers(
  balances: SlpTokenBalance[]
): SlpTokenBalance[] {
  balances.forEach((val) => (val.value = new BigNumber(val.value).shiftedBy(-1 * val.decimals)));
  return balances;
}

export function _convertUtxoBigNumbers(utxos: SlpUtxoI[]): SlpUtxoI[] {
  utxos.forEach((val) => {
    val.value = new BigNumber(val.value).shiftedBy(-1 * val.decimals);
    val.satoshis = Number(val.satoshis);
  });
  return utxos;
}

export function _convertSlpTokenInfo(
  tokenInfo: SlpTokenInfo | undefined
): SlpTokenInfo | undefined {
  if (!tokenInfo) return tokenInfo;

  tokenInfo.initialAmount = new BigNumber(tokenInfo.initialAmount).shiftedBy(-1 * tokenInfo.decimals);

  return tokenInfo;
}