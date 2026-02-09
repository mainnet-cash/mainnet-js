import {
  ElectrumClient,
  RequestResponse,
  ElectrumClientEvents,
  RPCNotification,
  ConnectionStatus,
} from "@electrum-cash/network";
import { default as NetworkProvider } from "./NetworkProvider.js";
import {
  HexHeaderI,
  TxI,
  Utxo,
  ElectrumBalanceI,
  HeaderI,
} from "../interface.js";
import { Network } from "../interface.js";
import {
  ElectrumRawTransaction,
  ElectrumRawTransactionVinWithValues,
  ElectrumRawTransactionWithInputValues,
  ElectrumUtxo,
} from "./interface.js";

import { CancelFn } from "../wallet/interface.js";
import { getTransactionHash } from "../util/transaction.js";
import { Config } from "../config.js";
import { decodeHeader } from "../util/header.js";
import { CacheProvider } from "../cache/interface.js";
import { IndexedDbCache } from "../cache/IndexedDbCache.js";
import { WebStorageCache } from "../cache/WebStorageCache.js";
import { MemoryCache } from "../cache/MemoryCache.js";

/** Internal type for cached verbose transactions. fetchHeight is stripped before returning. */
type CachedRawTransaction = ElectrumRawTransaction & { fetchHeight: number };

export default class ElectrumNetworkProvider implements NetworkProvider {
  public electrum: ElectrumClient<ElectrumClientEvents>;
  public subscriptions: number = 0;
  private subscriptionMap: Record<string, number> = {};
  private currentHeight: number = 0;
  private headerCancelFn?: CancelFn;

  private _cache: CacheProvider | undefined;

  get cache(): CacheProvider | undefined {
    if (
      !Config.UseMemoryCache &&
      !Config.UseLocalStorageCache &&
      !Config.UseIndexedDBCache
    ) {
      this._cache = undefined;
      return this._cache;
    }

    if (Config.UseMemoryCache && !(this._cache instanceof MemoryCache)) {
      this._cache = new MemoryCache();
      return this._cache;
    }

    if (
      Config.UseLocalStorageCache &&
      !(this._cache instanceof WebStorageCache)
    ) {
      this._cache = new WebStorageCache();
      return this._cache;
    }

    if (Config.UseIndexedDBCache && !(this._cache instanceof IndexedDbCache)) {
      this._cache = new IndexedDbCache();
      return this._cache;
    }

    return this._cache;
  }

  constructor(
    electrum: ElectrumClient<ElectrumClientEvents>,
    public network: Network = Network.MAINNET,
    private manualConnectionManagement?: boolean
  ) {
    if (electrum) {
      this.electrum = electrum;
    } else {
      throw new Error(`A electrum-cash client is required.`);
    }
  }

  async getUtxos(cashaddr: string): Promise<Utxo[]> {
    const result = await this.performRequest<ElectrumUtxo[]>(
      "blockchain.address.listunspent",
      cashaddr,
      "include_tokens"
    );
    return result.map((utxo) => ({
      address: cashaddr,
      txid: utxo.tx_hash,
      vout: utxo.tx_pos,
      satoshis: BigInt(utxo.value),
      height: utxo.height,
      token: utxo.token_data
        ? {
            ...utxo.token_data,
            amount: BigInt(utxo.token_data.amount),
          }
        : undefined,
    }));
  }

  async getBalance(cashaddr: string): Promise<bigint> {
    const result = await this.performRequest<ElectrumBalanceI>(
      "blockchain.address.get_balance",
      cashaddr
    );

    return BigInt(result.confirmed) + BigInt(result.unconfirmed);
  }

  async getHeader(
    height: number,
    verbose: boolean = false
  ): Promise<HeaderI | HexHeaderI> {
    const key = `header-${this.network}-${height}-${verbose}`;

    if (this.cache) {
      const cached = await this.cache.getItem(key);
      if (cached) {
        return verbose ? decodeHeader(JSON.parse(cached)) : JSON.parse(cached);
      }
    }

    const result = await this.performRequest<HexHeaderI>(
      "blockchain.header.get",
      height
    );
    if (this.cache) {
      await this.cache.setItem(key, JSON.stringify(result));
    }

    return verbose ? decodeHeader(result) : result;
  }

  async getRawTransactions(hashes: string[]): Promise<Map<string, string>> {
    if (hashes.length === 0) return new Map();

    const results = new Map<string, string>();
    const keys = hashes.map((hash) => `txraw-${this.network}-${hash}`);

    // batch cache read
    let cached: Map<string, string | null> | undefined;
    if (this.cache) {
      cached = await this.cache.getItems(keys);
    }

    const misses: string[] = [];
    for (let i = 0; i < hashes.length; i++) {
      const val = cached?.get(keys[i]);
      if (val) {
        results.set(hashes[i], val);
      } else {
        misses.push(hashes[i]);
      }
    }

    if (misses.length > 0) {
      const fetched = await Promise.all(
        misses.map(async (hash) => {
          const tx = await this.performRequest<string>(
            "blockchain.transaction.get",
            hash,
            false
          );
          return [hash, tx] as [string, string];
        })
      );

      // batch cache write
      if (this.cache) {
        const entries: [string, string][] = fetched.map(([hash, tx]) => [
          `txraw-${this.network}-${hash}`,
          tx,
        ]);
        await this.cache.setItems(entries);
      }

      for (const [hash, tx] of fetched) {
        results.set(hash, tx);
      }
    }

    return results;
  }

  async getHeaders(heights: number[]): Promise<Map<number, HeaderI>> {
    if (heights.length === 0) return new Map();

    const results = new Map<number, HeaderI>();
    const keys = heights.map((height) => `header-${this.network}-${height}-true`);

    // batch cache read
    let cached: Map<string, string | null> | undefined;
    if (this.cache) {
      cached = await this.cache.getItems(keys);
    }

    const misses: number[] = [];
    for (let i = 0; i < heights.length; i++) {
      const val = cached?.get(keys[i]);
      if (val) {
        results.set(heights[i], decodeHeader(JSON.parse(val)));
      } else {
        misses.push(heights[i]);
      }
    }

    if (misses.length > 0) {
      const fetched = await Promise.all(
        misses.map(async (height) => {
          const result = await this.performRequest<HexHeaderI>(
            "blockchain.header.get",
            height
          );
          return [height, result] as [number, HexHeaderI];
        })
      );

      // batch cache write
      if (this.cache) {
        const entries: [string, string][] = fetched.map(([height, result]) => [
          `header-${this.network}-${height}-true`,
          JSON.stringify(result),
        ]);
        await this.cache.setItems(entries);
      }

      for (const [height, result] of fetched) {
        results.set(height, decodeHeader(result));
      }
    }

    return results;
  }

  async getBlockHeight(): Promise<number> {
    if (!this.headerCancelFn) {
      this.headerCancelFn = await this.subscribeToHeaders(
        (header: HexHeaderI) => {
          if (header.height > this.currentHeight) {
            this.currentHeight = header.height;
          }
        }
      );
    }

    if (!this.currentHeight) {
      throw new Error(
        "Check failed for eventual inconsistency in subscription implementations."
      );
    }
    return this.currentHeight;
  }

  async getRawTransaction(
    txHash: string,
    verbose: true,
    loadInputValues: true
  ): Promise<ElectrumRawTransactionWithInputValues>;
  async getRawTransaction(
    txHash: string,
    verbose: true,
    loadInputValues?: false
  ): Promise<ElectrumRawTransaction>;
  async getRawTransaction(
    txHash: string,
    verbose?: false,
    loadInputValues?: false
  ): Promise<string>;
  async getRawTransaction(
    txHash: string,
    verbose: boolean = false,
    loadInputValues: boolean = false
  ): Promise<
    string | ElectrumRawTransaction | ElectrumRawTransactionWithInputValues
  > {
    const nonVerboseKey = `txraw-${this.network}-${txHash}`;
    const verboseKey = `tx-${this.network}-${txHash}`;
    const key = verbose ? verboseKey : nonVerboseKey;

    if (this.cache) {
      const cached = await this.cache.getItem(key);
      if (cached) {
        if (!verbose) {
          return cached;
        }

        const cachedTx = JSON.parse(cached) as CachedRawTransaction;
        if (cachedTx.confirmations > 0) {
          const currentHeight = await this.getBlockHeight();
          cachedTx.confirmations += currentHeight - cachedTx.fetchHeight;
        }
        const { fetchHeight: _, ...transaction } = cachedTx;

        if (loadInputValues) {
          return this.enrichWithInputValues(transaction);
        }

        return transaction;
      }
    }

    try {
      const result = await this.performRequest(
        "blockchain.transaction.get",
        txHash,
        verbose
      );

      if (!verbose) {
        const hex = result as string;
        if (this.cache) {
          await this.cache.setItem(key, hex);
        }
        return hex;
      }

      const cachedTx = result as CachedRawTransaction;
      cachedTx.confirmations ??= 0;
      cachedTx.fetchHeight = await this.getBlockHeight();

      if (this.cache) {
        await this.cache.setItem(key, JSON.stringify(cachedTx));
      }

      const { fetchHeight: _, ...transaction } = cachedTx;

      if (loadInputValues) {
        return this.enrichWithInputValues(transaction);
      }

      return transaction;
    } catch (error: any) {
      if (
        (error.message as string).indexOf(
          "No such mempool or blockchain transaction."
        ) > -1
      )
        throw Error(
          `Could not decode transaction ${txHash}. It might not exist on the current blockchain (${this.network}).`
        );
      else throw error;
    }
  }

  private async enrichWithInputValues(
    transaction: ElectrumRawTransaction
  ): Promise<ElectrumRawTransactionWithInputValues> {
    const hashes = [...new Set(transaction.vin.map((val) => val.txid))];
    const transactions = await Promise.all(
      hashes.map((hash) => this.getRawTransactionObject(hash, false))
    );
    const transactionMap = new Map<string, ElectrumRawTransaction>();
    transactions.forEach((val) => transactionMap.set(val.hash, val));

    const enrichedVin: ElectrumRawTransactionVinWithValues[] =
      transaction.vin.map((input) => {
        const output = transactionMap
          .get(input.txid)!
          .vout.find((val) => val.n === input.vout)!;
        return { ...input, ...output };
      });

    return { ...transaction, vin: enrichedVin };
  }

  // gets the decoded transaction in human readable form
  async getRawTransactionObject(
    txHash: string,
    loadInputValues: true
  ): Promise<ElectrumRawTransactionWithInputValues>;
  async getRawTransactionObject(
    txHash: string,
    loadInputValues?: false
  ): Promise<ElectrumRawTransaction>;
  async getRawTransactionObject(
    txHash: string,
    loadInputValues: boolean = false
  ): Promise<ElectrumRawTransaction | ElectrumRawTransactionWithInputValues> {
    if (loadInputValues) {
      return this.getRawTransaction(txHash, true, true);
    }
    return this.getRawTransaction(txHash, true);
  }

  async sendRawTransaction(
    txHex: string,
    awaitPropagation: boolean = true
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      let txHash = await getTransactionHash(txHex);
      if (!awaitPropagation) {
        this.performRequest("blockchain.transaction.broadcast", txHex);
        resolve(txHash);
      } else {
        let cancel: CancelFn;

        const waitForTransactionCallback = async (data) => {
          if (data && data[0] === txHash && data[1] !== null) {
            await cancel?.();
            resolve(txHash);
          }
        };
        cancel = await this.subscribeToTransaction(
          txHash,
          waitForTransactionCallback
        );

        this.performRequest("blockchain.transaction.broadcast", txHex).catch(
          async (error) => {
            await cancel?.();
            reject(error);
          }
        );
      }
    });
  }

  // Get transaction history of a given cashaddr
  async getHistory(
    cashaddr: string,
    fromHeight: number = 0,
    toHeight: number = -1
  ): Promise<TxI[]> {
    const result = await this.performRequest<TxI[]>(
      "blockchain.address.get_history",
      cashaddr,
      fromHeight,
      toHeight
    );

    return result;
  }

  // Get the minimum fee a low-priority transaction must pay in order to be accepted to the daemon's memory pool.
  async getRelayFee(): Promise<number> {
    const result = (await this.performRequest("blockchain.relayfee")) as number;

    return result;
  }

  public async watchAddressStatus(
    cashaddr: string,
    callback: (status: string | null) => void
  ): Promise<CancelFn> {
    const watchAddressStatusCallback = async (
      data: [address: string, status: string | null]
    ) => {
      // subscription acknowledgement is the latest known status or null if no status is known
      // status is an array: [ cashaddr, statusHash ]
      if (data instanceof Array) {
        if (data[0] !== cashaddr) {
          return;
        }
        callback(data[1]);
      }
    };

    return this.subscribeToAddress(cashaddr, watchAddressStatusCallback);
  }

  // watch for block headers and block height, if `skipCurrentHeight` is set, the notification about current block will not arrive
  public async watchBlocks(
    callback: (header: HexHeaderI) => void,
    skipCurrentHeight: boolean = true
  ): Promise<CancelFn> {
    let acknowledged = !skipCurrentHeight;
    const waitForBlockCallback = (_header: HexHeaderI | HexHeaderI[]) => {
      if (!acknowledged) {
        acknowledged = true;
        return;
      }

      _header = _header instanceof Array ? _header[0] : _header;
      callback(_header);
    };
    return this.subscribeToHeaders(waitForBlockCallback);
  }

  // Wait for the next block or a block at given blockchain height.
  public async waitForBlock(height?: number): Promise<HexHeaderI> {
    return new Promise(async (resolve) => {
      let cancelWatch: CancelFn;
      if (this.electrum.chainHeight && !height) {
        height = this.electrum.chainHeight + 1;
      }

      cancelWatch = await this.watchBlocks(async (header) => {
        if (!height) {
          height = header.height + 1;
          return;
        }

        if (header.height >= height) {
          await cancelWatch?.();
          resolve(header);
          return;
        }
      });
    });
  }

  // subscribe to notifications sent when new block is found, the block header is sent to callback
  async subscribeToHeaders(
    callback: (header: HexHeaderI) => void
  ): Promise<CancelFn> {
    return this.subscribeRequest(
      "blockchain.headers.subscribe",
      (data: HexHeaderI | HexHeaderI[]) => {
        callback(data[0] ?? data);
      }
    );
  }

  async subscribeToAddress(
    cashaddr: string,
    callback: (data: any) => void
  ): Promise<CancelFn> {
    return this.subscribeRequest(
      "blockchain.address.subscribe",
      callback,
      cashaddr
    );
  }

  async subscribeToTransaction(
    txHash: string,
    callback: (data: any) => void
  ): Promise<CancelFn> {
    return this.subscribeRequest(
      "blockchain.transaction.subscribe",
      callback,
      txHash
    );
  }

  private async performRequest<T>(
    name: string,
    ...parameters: (string | number | boolean)[]
  ): Promise<T> {
    await this.ready();

    const requestTimeout = new Promise(function (_resolve, reject) {
      setTimeout(function () {
        reject("electrum-cash request timed out, retrying");
      }, 30000);
    }).catch(function (e) {
      throw e;
    });

    const request = this.electrum.request(name, ...parameters);

    return await Promise.race([request, requestTimeout])
      .then((value) => {
        if (value instanceof Error) throw value;
        let result = value as RequestResponse;
        return result as T;
      })
      .catch(async () => {
        return await Promise.race([request, requestTimeout])
          .then((value) => {
            if (value instanceof Error) throw value;
            let result = value as RequestResponse;
            return result as T;
          })
          .catch(function (e) {
            throw e;
          });
      });
  }

  private async trackSubscription(
    methodName: string,
    ...parameters: (string | number | boolean)[]
  ): Promise<void> {
    const key = `${methodName}-${this.network}-${JSON.stringify(parameters)}`;
    if (this.subscriptionMap[key]) {
      this.subscriptionMap[key]++;
    } else {
      this.subscriptionMap[key] = 1;
    }

    await this.electrum.subscribe(methodName, ...parameters);
  }

  private async untrackSubscription(
    methodName: string,
    ...parameters: (string | number | boolean)[]
  ): Promise<void> {
    const key = `${methodName}-${this.network}-${JSON.stringify(parameters)}`;
    if (this.subscriptionMap[key]) {
      this.subscriptionMap[key]--;
      if (this.subscriptionMap[key] <= 0) {
        // only really unsubscribe if there are no more subscriptions for this `key`
        delete this.subscriptionMap[key];

        try {
          await this.electrum.unsubscribe(methodName, ...parameters);
        } catch {}
      }
    }
  }

  public async subscribeRequest(
    methodName: string,
    callback: (data) => void,
    ...parameters: (string | number | boolean)[]
  ): Promise<CancelFn> {
    await this.ready();

    const handler = (data: RPCNotification) => {
      if (data.method === methodName) {
        callback(data.params);
      }
    };

    this.electrum.on("notification", handler);
    await this.trackSubscription(methodName, ...parameters);
    this.subscriptions++;

    return async () => {
      this.electrum.off("notification", handler);
      await this.untrackSubscription(methodName, ...parameters);
      this.subscriptions--;
    };
  }

  async ready(): Promise<boolean | unknown> {
    return this.connect();
  }

  async connect(): Promise<void> {
    await this.cache?.init();
    if (this.electrum.status !== ConnectionStatus.CONNECTED) {
      await this.electrum.connect();
    }
  }

  async disconnect(): Promise<boolean> {
    if (this.subscriptions > 0) {
      // console.warn(
      //   `Trying to disconnect a network provider with ${this.subscriptions} active subscriptions. This is in most cases a bad idea.`
      // );
    }
    await this.headerCancelFn?.();
    return this.electrum.disconnect(true, false);
  }
}
