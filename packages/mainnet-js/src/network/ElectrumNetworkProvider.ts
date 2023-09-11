import {
  ElectrumCluster,
  ElectrumClient,
  RequestResponse,
  ConnectionStatus,
} from "electrum-cash";
import { default as NetworkProvider } from "./NetworkProvider.js";
import { HeaderI, TxI, UtxoI, ElectrumBalanceI } from "../interface.js";
import { Network } from "../interface.js";
import { delay } from "../util/delay.js";
import { ElectrumRawTransaction, ElectrumUtxo } from "./interface.js";

import { CancelWatchFn } from "../wallet/interface.js";
import { getTransactionHash } from "../util/transaction.js";

export default class ElectrumNetworkProvider implements NetworkProvider {
  public electrum: ElectrumCluster | ElectrumClient;
  public subscriptions: number = 0;
  public version;
  private connectPromise;
  private blockHeight = 0;

  constructor(
    electrum: ElectrumCluster | ElectrumClient,
    public network: Network = Network.MAINNET,
    private manualConnectionManagement?: boolean
  ) {
    if (electrum) {
      this.electrum = electrum;
      this.connectPromise = this.getConnectPromise();
      if (this.electrum instanceof ElectrumCluster) {
        this.version = (this.electrum as ElectrumCluster).version;
      } else {
        this.version = (this.electrum as ElectrumClient).connection.version;
      }
    } else {
      throw new Error(`A electrum-cash cluster or client is required.`);
    }
  }

  private async getConnectPromise(_timeout: number = 3000) {
    // connects to the electrum cash and waits until the connection is ready to accept requests
    let timeoutHandle;

    await Promise.race([
      new Promise(async (resolve) => {
        this.connectPromise = undefined;

        if (this.electrum instanceof ElectrumCluster) {
          try {
            await this.connectCluster();
          } catch (e) {
            console.warn(
              `Unable to connect to one or more electrum-cash hosts: ${JSON.stringify(
                e
              )}`
            );
          }
          resolve(await this.readyCluster());
        } else {
          resolve(await this.connectClient());
        }
      }),
      // new Promise(
      //   (_resolve, reject) =>
      //     (timeoutHandle = setTimeout(() => {
      //       reject(
      //         new Error(`Timeout connecting to electrum network: ${this.network}`)
      //       );
      //     }, _timeout))
      // ),
    ]);
    clearTimeout(timeoutHandle);
  }

  async getUtxos(cashaddr: string): Promise<UtxoI[]> {
    const result = (await this.performRequest(
      "blockchain.address.listunspent",
      cashaddr,
      "include_tokens"
    )) as ElectrumUtxo[];
    return result.map((utxo) => ({
      txid: utxo.tx_hash,
      vout: utxo.tx_pos,
      satoshis: utxo.value,
      height: utxo.height,
      token: utxo.token_data
        ? {
            amount: Number(utxo.token_data.amount),
            tokenId: utxo.token_data.category,
            capability: utxo.token_data.nft?.capability,
            commitment: utxo.token_data.nft?.commitment,
          }
        : undefined,
    }));
  }

  async getBalance(cashaddr: string): Promise<number> {
    const result = (await this.performRequest(
      "blockchain.address.get_balance",
      cashaddr
    )) as ElectrumBalanceI;

    return result.confirmed + result.unconfirmed;
  }

  async getBlockHeight(): Promise<number> {
    return ((await this.performRequest("blockchain.headers.get_tip")) as any)
      .height;
  }

  static rawTransactionCache = {};
  async getRawTransaction(
    txHash: string,
    verbose: boolean = false,
    loadInputValues: boolean = false
  ): Promise<string> {
    const key = `${this.network}-${txHash}-${verbose}-${loadInputValues}`;
    if (ElectrumNetworkProvider.rawTransactionCache[key]) {
      return ElectrumNetworkProvider.rawTransactionCache[key];
    }

    try {
      const transaction = (await this.performRequest(
        "blockchain.transaction.get",
        txHash,
        verbose
      )) as ElectrumRawTransaction;

      ElectrumNetworkProvider.rawTransactionCache[key] = transaction;

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
        const waitForTransactionCallback = async (data) => {
          if (data && data[0] === txHash) {
            this.unsubscribeFromTransaction(txHash, waitForTransactionCallback);
            resolve(txHash);
          }
        };
        this.subscribeToTransaction(txHash, waitForTransactionCallback);

        this.performRequest("blockchain.transaction.broadcast", txHex).catch(
          (error) => {
            this.unsubscribeFromTransaction(txHash, waitForTransactionCallback);
            reject(error);
          }
        );
      }
    });
  }

  // Get transaction history of a given cashaddr
  async getHistory(cashaddr: string): Promise<TxI[]> {
    const result = (await this.performRequest(
      "blockchain.address.get_history",
      cashaddr
    )) as TxI[];

    return result;
  }

  // Get the minimum fee a low-priority transaction must pay in order to be accepted to the daemon's memory pool.
  async getRelayFee(): Promise<number> {
    const result = (await this.performRequest("blockchain.relayfee")) as number;

    return result;
  }

  public watchAddressStatus(
    cashaddr: string,
    callback: (status: string) => void
  ): CancelWatchFn {
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

    this.subscribeToAddress(cashaddr, watchAddressStatusCallback);

    return async () => {
      await this.unsubscribeFromAddress(cashaddr, watchAddressStatusCallback);
    };
  }

  public watchAddress(
    cashaddr: string,
    callback: (txHash: string) => void
  ): CancelWatchFn {
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

  public watchAddressTransactions(
    cashaddr: string,
    callback: (tx: ElectrumRawTransaction) => void
  ): CancelWatchFn {
    return this.watchAddress(cashaddr, async (txHash: string) => {
      const tx = await this.getRawTransactionObject(txHash);
      callback(tx);
    });
  }

  public watchAddressTokenTransactions(
    cashaddr: string,
    callback: (tx: ElectrumRawTransaction) => void
  ): CancelWatchFn {
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

  // Wait for the next block or a block at given blockchain height.
  public watchBlocks(callback: (header: HeaderI) => void): CancelWatchFn {
    let acknowledged = false;
    const waitForBlockCallback = (_header: HeaderI | HeaderI[]) => {
      if (!acknowledged) {
        acknowledged = true;
        return;
      }

      _header = _header instanceof Array ? _header[0] : _header;
      callback(_header);
    };
    this.subscribeToHeaders(waitForBlockCallback);

    return async () => {
      this.unsubscribeFromHeaders(waitForBlockCallback);
    };
  }

  // Wait for the next block or a block at given blockchain height.
  public async waitForBlock(height?: number): Promise<HeaderI> {
    return new Promise(async (resolve) => {
      const cancelWatch = this.watchBlocks(async (header) => {
        if (height === undefined || header.height >= height!) {
          await cancelWatch();
          resolve(header);
        }
      });
    });
  }

  // subscribe to notifications sent when new block is found, the block header is sent to callback
  async subscribeToHeaders(callback: (header: HeaderI) => void): Promise<void> {
    await this.subscribeRequest("blockchain.headers.subscribe", callback);
  }

  // unsubscribe to notifications sent when new block is found
  async unsubscribeFromHeaders(
    callback: (header: HeaderI) => void
  ): Promise<void> {
    await this.unsubscribeRequest("blockchain.headers.subscribe", callback);
  }

  async subscribeToAddress(
    cashaddr: string,
    callback: (data: any) => void
  ): Promise<void> {
    await this.subscribeRequest(
      "blockchain.address.subscribe",
      callback,
      cashaddr
    );
  }

  async unsubscribeFromAddress(
    cashaddr: string,
    callback: (data: any) => void
  ): Promise<void> {
    await this.unsubscribeRequest(
      "blockchain.address.subscribe",
      callback,
      cashaddr
    );
  }

  async subscribeToAddressTransactions(
    cashaddr: string,
    callback: (data: any) => void
  ): Promise<void> {
    await this.subscribeRequest(
      "blockchain.address.transactions.subscribe",
      callback,
      cashaddr
    );
  }

  async unsubscribeFromAddressTransactions(
    cashaddr: string,
    callback: (data: any) => void
  ): Promise<void> {
    await this.unsubscribeRequest(
      "blockchain.address.transactions.subscribe",
      callback,
      cashaddr
    );
  }

  async subscribeToTransaction(
    txHash: string,
    callback: (data: any) => void
  ): Promise<void> {
    await this.subscribeRequest(
      "blockchain.transaction.subscribe",
      callback,
      txHash
    );
  }

  async unsubscribeFromTransaction(
    txHash: string,
    callback: (data: any) => void
  ): Promise<void> {
    await this.unsubscribeRequest(
      "blockchain.transaction.subscribe",
      callback,
      txHash
    );
  }

  private async performRequest(
    name: string,
    ...parameters: (string | number | boolean)[]
  ): Promise<RequestResponse> {
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
        return result;
      })
      .catch(async () => {
        // console.warn(
        //   "initial electrum-cash request attempt timed out, retrying..."
        // );
        return await Promise.race([request, requestTimeout])
          .then((value) => {
            if (value instanceof Error) throw value;
            let result = value as RequestResponse;
            return result;
          })
          .catch(function (e) {
            throw e;
          });
      });
  }

  private async subscribeRequest(
    methodName: string,
    callback: (data) => void,
    ...parameters: (string | number | boolean)[]
  ): Promise<true> {
    await this.ready();

    const result = await this.electrum.subscribe(
      callback,
      methodName,
      ...parameters
    );

    this.subscriptions++;

    return result;
  }

  private async unsubscribeRequest(
    methodName: string,
    callback: (data) => void,
    ...parameters: (string | number | boolean)[]
  ): Promise<true> {
    await this.ready();

    const result = this.electrum.unsubscribe(
      callback,
      methodName,
      ...parameters
    );

    this.subscriptions--;

    return result;
  }

  async ready(): Promise<boolean | unknown> {
    return (await this.connect()) as void[];
  }

  async connect(): Promise<void[]> {
    return await this.connectPromise;
  }

  disconnect(): Promise<boolean[]> {
    if (this.subscriptions > 0) {
      // console.warn(
      //   `Trying to disconnect a network provider with ${this.subscriptions} active subscriptions. This is in most cases a bad idea.`
      // );
    }
    return this.isElectrumClient()
      ? this.disconnectClient()
      : this.disconnectCluster();
  }

  isElectrumClient(): boolean {
    return this.electrum.hasOwnProperty("connection");
  }

  async readyClient(timeout?: number): Promise<boolean | unknown> {
    timeout = typeof timeout !== "undefined" ? timeout : 3000;

    let connectPromise = async () => {
      while (
        (this.electrum as ElectrumClient).connection.status !==
        ConnectionStatus.CONNECTED
      ) {
        await delay(100);
      }
      return true;
    };
    return connectPromise;
  }

  async readyCluster(timeout?: number): Promise<boolean> {
    timeout;
    return (this.electrum as ElectrumCluster).ready();
  }

  async connectCluster(): Promise<void[]> {
    return (this.electrum as ElectrumCluster).startup();
  }

  async connectClient(): Promise<void[]> {
    let connectionPromise = async () => {
      try {
        return await (this.electrum as ElectrumClient).connect();
      } catch (e) {
        console.warn(
          `Warning: Failed to connect to client on ${this.network} at ${
            (this.electrum as ElectrumClient).connection.host
          }.`,
          e
        );
        return;
      }
    };
    return [await connectionPromise()];
  }

  async disconnectCluster(): Promise<boolean[]> {
    return (this.electrum as ElectrumCluster).shutdown();
  }

  async disconnectClient(): Promise<boolean[]> {
    return [await (this.electrum as ElectrumClient).disconnect(true)];
  }
}
