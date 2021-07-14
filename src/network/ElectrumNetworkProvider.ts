import {
  ElectrumCluster,
  ElectrumClient,
  RequestResponse,
  ConnectionStatus,
} from "electrum-cash";
import { default as NetworkProvider } from "./NetworkProvider";
import { HeaderI, TxI, UtxoI, ElectrumBalanceI } from "../interface";
import { Network } from "../interface";
import { delay } from "../util/delay";
import { BlockHeader, ElectrumRawTransaction, ElectrumUtxo } from "./interface";

import { Mutex } from "async-mutex";

export default class ElectrumNetworkProvider implements NetworkProvider {
  public electrum: ElectrumCluster | ElectrumClient;
  public subscriptions: number = 0;
  private connectPromise;
  private mutex = new Mutex();
  private random = Math.random();

  constructor(
    electrum: ElectrumCluster | ElectrumClient,
    public network: Network = Network.MAINNET,
    private manualConnectionManagement?: boolean
  ) {
    if (electrum) {
      this.electrum = electrum;
      this.connectPromise = this.getConnectPromise();
    } else {
      throw new Error(`A electrum-cash cluster or client is required.`);
    }
  }

  private getConnectPromise(_timeout: number = 10000) {
    // connects to the electrum cash and waits until the connection is ready to accept requests
    let timeoutHandle;

    return Promise.race([
      new Promise(async (resolve) => {
        this.connectPromise = undefined;

        if (this.electrum instanceof ElectrumCluster) {
          await this.connectCluster();
          resolve(await this.readyCluster());
        } else {
          resolve(await this.connectClient());
        }
      }),
      // new Promise((_resolve, reject) => timeoutHandle = setTimeout(() => { console.warn(`Could not connect to electrum network ${this.network}`); reject(new Error(`Could not connect to electrum network ${this.network}`))}, timeout))
    ]).then(() => clearTimeout(timeoutHandle));
  }

  async getUtxos(cashaddr: string): Promise<UtxoI[]> {
    const result = (await this.performRequest(
      "blockchain.address.listunspent",
      cashaddr
    )) as ElectrumUtxo[];

    const utxos = result.map((utxo) => ({
      txid: utxo.tx_hash,
      vout: utxo.tx_pos,
      satoshis: utxo.value,
      height: utxo.height,
    }));

    return utxos;
  }

  async getBalance(cashaddr: string): Promise<number> {
    const result = (await this.performRequest(
      "blockchain.address.get_balance",
      cashaddr
    )) as ElectrumBalanceI;

    return result.confirmed + result.unconfirmed;
  }

  async getBlockHeight(): Promise<number> {
    const { height } = (await this.performRequest(
      "blockchain.headers.subscribe"
    )) as BlockHeader;

    return height;
  }

  async getRawTransaction(
    txHash: string,
    verbose: boolean = false
  ): Promise<string> {
    try {
      return (await this.performRequest(
        "blockchain.transaction.get",
        txHash,
        verbose
      )) as string;
    } catch (error: any) {
      if (
        (error.message as string).indexOf(
          "No such mempool or blockchain transaction."
        ) > -1
      )
        throw Error(
          `Could not decode transaction. It might not exist on the current blockchain (${this.network}).`
        );
      else throw error;
    }
  }

  // gets the decoded transaction in human readable form
  async getRawTransactionObject(
    txHash: string
  ): Promise<ElectrumRawTransaction> {
    return (await this.getRawTransaction(
      txHash,
      true
    )) as unknown as ElectrumRawTransaction;
  }

  async sendRawTransaction(txHex: string): Promise<string> {
    let result = (await this.performRequest(
      "blockchain.transaction.broadcast",
      txHex
    )) as string;

    // This assumes the fulcrum server is configured with a 0.5s delay
    await delay(1050);
    return result;
  }

  async sendRawTransactionFast(
    txHex: string,
    cashaddr: string
  ): Promise<string> {
    return new Promise(async (resolve) => {
      let txHash;

      const waitForTransactionCallback = async (data) => {
        if (data instanceof Array) {
          let addr = data[0] as string;
          if (addr !== cashaddr) {
            return;
          }

          this.unsubscribeFromAddress(cashaddr, waitForTransactionCallback);

          resolve(txHash);
        }
      };
      this.subscribeToAddress(cashaddr, waitForTransactionCallback);

      this.performRequest("blockchain.transaction.broadcast", txHex).then(
        (result) => {
          txHash = result as string;
        }
      );
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

  // Wait for the next block or a block at given blockchain height.
  public async waitForBlock(height?: number): Promise<HeaderI> {
    return new Promise(async (resolve) => {
      let acknowledged = false;
      const waitForBlockCallback = async (header: any) => {
        if (!acknowledged) {
          acknowledged = true;
          return;
        }

        header = header instanceof Array ? header[0] : header;

        if (height === undefined || header.height >= height!) {
          await this.unsubscribeFromHeaders(waitForBlockCallback);
          resolve(header);
        }
      };
      await this.subscribeToHeaders(waitForBlockCallback);
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

  private async performRequest(
    name: string,
    ...parameters: (string | number | boolean)[]
  ): Promise<RequestResponse> {
    await this.ready();

    const result = await this.electrum.request(name, ...parameters);

    if (result instanceof Error) throw result;

    return result;
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
    return await this.mutex.runExclusive(async () => {
      return await this.connectPromise;
    });
  }

  disconnect(): Promise<boolean[]> {
    if (this.subscriptions > 0) {
      console.warn(
        `Trying to disconnect a network provider with ${this.subscriptions} active subscriptions. This is in most cases a bad idea.`
      );
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
    return [await (this.electrum as ElectrumClient).connect()];
  }

  async disconnectCluster(): Promise<boolean[]> {
    return (this.electrum as ElectrumCluster).shutdown();
  }

  async disconnectClient(): Promise<boolean[]> {
    return [await (this.electrum as ElectrumClient).disconnect(true)];
  }
}
