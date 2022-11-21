import { Network, TxI } from "../interface.js";
import {
  GsppTx,
  SlpTokenBalance,
  SlpTokenInfo,
  SlpTxI,
  SlpUtxoI,
} from "./interface.js";
import BigNumber from "bignumber.js";
import {
  SlpCancelWatchFn,
  SlpProvider,
  SlpWatchBalanceCallback,
  SlpWatchTransactionCallback,
  _emptyTokenBalance,
} from "./SlpProvider.js";
import axios from "axios";
import { btoa } from "../util/base64.js";

//import EventSource from "../../polyfill/eventsource.js";
import EventSource from "../util/eventsource.js";
import {
  getRuntimePlatform,
  RuntimePlatform,
} from "../util/getRuntimePlatform.js";

export class GsppProvider implements SlpProvider {
  public static defaultServers = {
    mainnet: {
      dataSource: "https://gs.fountainhead.cash",
      eventSource: "https://slpsocket.fountainhead.cash",
    },
    testnet: {
      dataSource: "https://gs-testnet.fountainhead.cash",
      eventSource: "https://slpsocket-testnet.fountainhead.cash",
    },
    regtest: {
      dataSource: "http://localhost:12400",
      eventSource: "http://localhost:12401",
    },
  };

  public servers = { ...GsppProvider.defaultServers };

  public caching: boolean = false;

  constructor(public network: Network = Network.MAINNET) {
    if (getRuntimePlatform() === RuntimePlatform.node) {
      if (process.env.GSPP_MAINNET_DATA)
        this.servers.mainnet.dataSource = process.env.GSPP_MAINNET_DATA;
      if (process.env.GSPP_MAINNET_EVENTS)
        this.servers.mainnet.eventSource = process.env.GSPP_MAINNET_EVENTS;
      if (process.env.GSPP_TESTNET_DATA)
        this.servers.testnet.dataSource = process.env.GSPP_TESTNET_DATA;
      if (process.env.GSPP_TESTNET_EVENTS)
        this.servers.testnet.eventSource = process.env.GSPP_TESTNET_EVENTS;
      if (process.env.GSPP_REGTEST_DATA)
        this.servers.regtest.dataSource = process.env.GSPP_REGTEST_DATA;
      if (process.env.GSPP_REGTEST_EVENTS)
        this.servers.regtest.eventSource = process.env.GSPP_REGTEST_EVENTS;
    }
  }

  // all oupoints, including mint batons
  async SlpOutpoints(slpaddr: string): Promise<String[]> {
    return (
      await this.GsppQuery({ cashaddr: slpaddr }, "v1/graphsearch/slpoutpoints")
    ).outpoints as String[];
  }

  // all utxos, including mint batons
  async SlpUtxos(slpaddr: string): Promise<SlpUtxoI[]> {
    const response = (
      await this.GsppQuery({ cashaddr: slpaddr }, "v1/graphsearch/slputxos")
    ).utxos as SlpUtxoI[];

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
    return (await this.SlpUtxos(slpaddr)).filter(
      (val) =>
        val.isBaton === false && (tokenId ? val.tokenId === tokenId : true)
    );
  }

  // token mint baton utxos
  async SlpBatonUtxos(slpaddr: string, tokenId?: string): Promise<SlpUtxoI[]> {
    return (await this.SlpUtxos(slpaddr)).filter(
      (val) =>
        val.isBaton === true && (tokenId ? val.tokenId === tokenId : true)
    );
  }

  // look up the token information
  async SlpTokenInfo(tokenId: string): Promise<SlpTokenInfo | undefined> {
    const info = (await this.GsppQuery(
      { tokenId: tokenId },
      "v1/graphsearch/slptokeninfo"
    )) as SlpTokenInfo;
    return _convertSlpTokenInfo(info);
  }

  // get all token balances
  async SlpAllTokenBalances(slpaddr: string): Promise<SlpTokenBalance[]> {
    return _convertBalanceBigNumbers(
      ((
        await this.GsppQuery(
          { cashaddr: slpaddr },
          "v1/graphsearch/slpalltokenbalances"
        )
      ).balances || []) as SlpTokenBalance[]
    );
  }

  // get specific token balance
  async SlpTokenBalance(
    slpaddr: string,
    tokenId: string
  ): Promise<SlpTokenBalance> {
    const response = await this.GsppQuery(
      { cashaddr: slpaddr, tokenId: tokenId },
      "v1/graphsearch/slptokenbalance"
    );
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
    _slpaddr: string,
    _tokenId?: string,
    _limit: number = 100,
    _skip: number = 0
  ): Promise<SlpTxI[]> {
    throw "Not implemented";
  }

  // waits for next slp transaction to appear in mempool, code execution is halted
  async SlpWaitForTransaction(
    slpaddr: string,
    tokenId?: string
  ): Promise<SlpTxI> {
    return new Promise(async (resolve) => {
      const cancelFn = this.SlpWatchTransactions(
        async (tx: SlpTxI) => {
          await cancelFn();
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
    return new Promise((resolve) => {
      const cancelFn = this.SlpWatchBalance(
        async (balance: SlpTokenBalance) => {
          if (balance.value.isGreaterThanOrEqualTo(new BigNumber(value))) {
            await cancelFn();
            resolve(balance);
          }
        },
        slpaddr,
        tokenId
      );
    });
  }

  // sets up a callback to be executed each time the token balance of the wallet is changed
  SlpWatchBalance(
    callback: SlpWatchBalanceCallback,
    slpaddr: string,
    tokenId: string
  ): SlpCancelWatchFn {
    return this.SlpWatchTransactions(
      async () => {
        const balance = await this.SlpTokenBalance(slpaddr, tokenId);
        callback(balance);
      },
      slpaddr,
      tokenId
    );
  }

  // sets up a callback to be executed each time a new transaction associated with this wallet's address is entering the mempool
  SlpWatchTransactions(
    callback: SlpWatchTransactionCallback,
    slpaddr?: string,
    tokenId?: string
  ): SlpCancelWatchFn {
    const eventSource: EventSource = this.SlpSocketEventSource({
      query: { slpaddr, tokenId },
    });
    const cancelFn: SlpCancelWatchFn = async () => {
      eventSource.close();
    };

    eventSource.addEventListener(
      "message",
      async (txEvent: MessageEvent) => {
        const data = JSON.parse(txEvent.data);
        if (data.type === "rawtx") {
          const tx: SlpTxI = {
            tx_hash: data.data.txHash,
            height: 0,
            details: data.data as GsppTx,
          };

          callback(tx);
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

    // console.log(queryObject, endpoint);

    return new Promise((resolve, reject) => {
      const url = `${this.servers[this.network].dataSource}/${endpoint}`;
      fetch_retry(url, queryObject)
        .then((response: any) => {
          resolve(response.data);
        })
        .catch((error) => {
          if (error.isAxiosError) {
            // console.trace(JSON.stringify(error, null, 2));
            reject(error.response.data);
          }

          reject(error);
        });
    });
  }

  public SlpSocketEventSource(queryObject: any): EventSource {
    const url = `${this.servers[this.network].eventSource}/s/${B64QueryString(
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
    throw new Error("Empty query");
  }
  return btoa(JSON.stringify(queryObject));
};

export function _convertBalanceBigNumbers(
  balances: SlpTokenBalance[]
): SlpTokenBalance[] {
  balances.forEach(
    (val) => (val.value = new BigNumber(val.value).shiftedBy(-1 * val.decimals))
  );
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

  tokenInfo.initialAmount = new BigNumber(tokenInfo.initialAmount).shiftedBy(
    -1 * tokenInfo.decimals
  );
  tokenInfo.parentTokenId = (tokenInfo as any).groupId;

  return tokenInfo;
}
