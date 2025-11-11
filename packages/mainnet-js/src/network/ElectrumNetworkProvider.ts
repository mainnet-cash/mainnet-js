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
  UtxoI,
  ElectrumBalanceI,
  HeaderI,
} from "../interface.js";
import { Network } from "../interface.js";
import { delay } from "../util/delay.js";
import { ElectrumRawTransaction, ElectrumUtxo } from "./interface.js";

import { CancelFn } from "../wallet/interface.js";
import { getTransactionHash } from "../util/transaction.js";
import { Config } from "../config.js";
import { decodeHeader } from "../util/header.js";
import { CacheProvider } from "../cache/interface.js";
import { IndexedDbCache } from "../cache/IndexedDbCache.js";
import { WebStorageCache } from "../cache/WebStorageCache.js";
import { MemoryCache } from "../cache/MemoryCache.js";

export default class ElectrumNetworkProvider implements NetworkProvider {
  public electrum: ElectrumClient<ElectrumClientEvents>;
  public subscriptions: number = 0;
  private subscribedToHeaders: boolean = false;
  private subscriptionMap: Record<string, number> = {};

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
      this._cache = new IndexedDbCache();
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

  async getUtxos(cashaddr: string): Promise<UtxoI[]> {
    const result = await this.performRequest<ElectrumUtxo[]>(
      "blockchain.address.listunspent",
      cashaddr,
      "include_tokens"
    );
    return result.map((utxo) => ({
      txid: utxo.tx_hash,
      vout: utxo.tx_pos,
      satoshis: utxo.value,
      height: utxo.height,
      token: utxo.token_data
        ? {
            amount: BigInt(utxo.token_data.amount),
            tokenId: utxo.token_data.category,
            capability: utxo.token_data.nft?.capability,
            commitment: utxo.token_data.nft?.commitment,
          }
        : undefined,
    }));
  }

  async getBalance(cashaddr: string): Promise<number> {
    const result = await this.performRequest<ElectrumBalanceI>(
      "blockchain.address.get_balance",
      cashaddr
    );

    return result.confirmed + result.unconfirmed;
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

  async getBlockHeight(): Promise<number> {
    return (await this.performRequest<HexHeaderI>("blockchain.headers.get_tip"))
      .height;
  }

  async getRawTransaction(
    txHash: string,
    verbose: boolean = false,
    loadInputValues: boolean = false
  ): Promise<string> {
    const key = `tx-${this.network}-${txHash}-${verbose}-${loadInputValues}`;

    if (this.cache) {
      const cached = await this.cache.getItem(key);
      if (cached) {
        return verbose ? JSON.parse(cached) : cached;
      }
    }

    try {
      const transaction = (await this.performRequest(
        "blockchain.transaction.get",
        txHash,
        verbose
      )) as ElectrumRawTransaction;

      if (this.cache) {
        await this.cache.setItem(
          key,
          verbose
            ? JSON.stringify(transaction)
            : (transaction as unknown as string)
        );
      }

      if (verbose && loadInputValues) {
        // get unique transaction hashes
        const hashes = [...new Set(transaction.vin.map((val) => val.txid))];
        const transactions = await Promise.all(
          hashes.map((hash) => this.getRawTransactionObject(hash, false))
        );
        const transactionMap = new Map<string, ElectrumRawTransaction>();
        transactions.forEach((val) => transactionMap.set(val.hash, val));

        transaction.vin.forEach((input) => {
          const output = transactionMap
            .get(input.txid)!
            .vout.find((val) => val.n === input.vout)!;
          input.address = output.scriptPubKey.addresses[0];
          input.value = output.value;
          input.tokenData = output.tokenData;
        });
      }

      return transaction as any;
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

  // gets the decoded transaction in human readable form
  async getRawTransactionObject(
    txHash: string,
    loadInputValues: boolean = false
  ): Promise<ElectrumRawTransaction> {
    return (await this.getRawTransaction(
      txHash,
      true,
      loadInputValues
    )) as unknown as ElectrumRawTransaction;
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
    callback: (status: string) => void
  ): Promise<CancelFn> {
    const watchAddressStatusCallback = async (data) => {
      // subscription acknowledgement is the latest known status or null if no status is known
      // status is an array: [ cashaddr, statusHash ]
      if (data instanceof Array) {
        const addr = data[0] as string;
        if (addr !== cashaddr) {
          return;
        }

        const status = data[1];
        callback(status);
      }
    };

    return this.subscribeToAddress(cashaddr, watchAddressStatusCallback);
  }

  public async watchAddress(
    cashaddr: string,
    callback: (txHash: string) => void
  ): Promise<CancelFn> {
    const historyMap: { [txid: string]: boolean } = {};

    this.getHistory(cashaddr).then((history) =>
      history.forEach((val) => (historyMap[val.tx_hash] = true))
    );

    const watchAddressStatusCallback = async () => {
      const newHistory = await this.getHistory(cashaddr);
      // sort history to put unconfirmed transactions in the beginning, then transactions in block height descenting order
      const txHashes = newHistory
        .sort((a, b) =>
          a.height <= 0 || b.height <= 0 ? -1 : b.height - a.height
        )
        .map((val) => val.tx_hash);
      for (const hash of txHashes) {
        if (!(hash in historyMap)) {
          historyMap[hash] = true;
          callback(hash);
          // exit early to prevent further map lookups
          break;
        }
      }
    };

    return this.watchAddressStatus(cashaddr, watchAddressStatusCallback);
  }

  public async watchAddressTransactions(
    cashaddr: string,
    callback: (tx: ElectrumRawTransaction) => void
  ): Promise<CancelFn> {
    return this.watchAddress(cashaddr, async (txHash: string) => {
      const tx = await this.getRawTransactionObject(txHash);
      callback(tx);
    });
  }

  public async watchAddressTokenTransactions(
    cashaddr: string,
    callback: (tx: ElectrumRawTransaction) => void
  ): Promise<CancelFn> {
    return this.watchAddress(cashaddr, async (txHash: string) => {
      const tx = await this.getRawTransactionObject(txHash, true);
      if (
        tx.vin.some((val) => val.tokenData) ||
        tx.vout.some((val) => val.tokenData)
      ) {
        callback(tx);
      }
    });
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
    return this.subscribeRequest("blockchain.headers.subscribe", callback);
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

    // safeguard against multiple subscriptions to headers
    if (methodName === "blockhain.headers.subscribe") {
      if (!this.subscribedToHeaders) {
        this.subscribedToHeaders = true;

        await this.trackSubscription(methodName, ...parameters);
      }
    } else {
      await this.trackSubscription(methodName, ...parameters);
    }

    this.subscriptions++;

    return async () => {
      this.electrum.off("notification", handler);
      this.subscriptions--;

      // there are no blockchain.headers.unsubscribe method, so let's safeguard against it
      if (methodName !== "blockchain.headers.subscribe") {
        await this.untrackSubscription(methodName, ...parameters);
      }
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

  disconnect(): Promise<boolean> {
    if (this.subscriptions > 0) {
      // console.warn(
      //   `Trying to disconnect a network provider with ${this.subscriptions} active subscriptions. This is in most cases a bad idea.`
      // );
    }
    return this.electrum.disconnect(true, false);
  }
}
