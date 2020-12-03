import { default as SqlProvider } from "../db/SqlProvider";
import { WebHookI } from "../db/interface";

import { Network, Tx } from "../interface";
import { Connection } from "../network/Connection";
const axios = require('axios').default

export default class WebhookWorker {
  activeHooks: Map<number, WebHookI> = new Map();
  callbacks: Map<number, (data: any | string | Array<string>) => void> = new Map();
  connection: Connection;
  db: SqlProvider;
  network: Network;

  constructor(network: Network = Network.MAINNET) {
    this.network = network;
    this.connection = new Connection(this.network);
    this.db = new SqlProvider(this.network);
  }

  async init(): Promise<void> {
    await this.connection.ready();
    await this.db.init();

    await this.evictOldHooks();
    await this.pickupHooks();
    setTimeout(async() => {
      await this.evictOldHooks();
      await this.pickupHooks();
    }, 5*60*1000);
  }

  async pickupHooks(start: boolean = false): Promise<void> {
    const hooks: WebHookI[]  = await this.db.getWebHooks();
    for (const hook of hooks) {
      if (!this.activeHooks.has(hook.id!)) {
        this.activeHooks.set(hook.id!, hook);
        if (start) {
          this.startHook(hook);
        }
      }
    }
  }

  async destroy(): Promise<void> {
    await this.stop();
    await this.connection.disconnect();
    await this.db.close();
  }

  async evictOldHooks(): Promise<void> {
    const hooks: WebHookI[] = await this.db.getWebHooks();
    for (const hook of hooks) {
      if (new Date() >= hook.expires_at) {
        console.log("Evicting expired hook with id", hook.id);
        await this.stopHook(hook);
        await this.db.deleteWebHook(hook.id!);
      }
    }
  }

  async start(): Promise<void> {
    for (const [key, hook] of this.activeHooks) {
      this.startHook(hook);
    }
  }

  async startHook(hook: WebHookI): Promise<void> {
    const callback = async (data: string | Array<string>) => {
      // console.log(data);
      let status: string = "";
      if (typeof data === "string") {
        // subscription acknowledgement notification with current status
        status = data;
        return;
      } else if (data instanceof Array) {
        status = data[1];
        if (data[0] !== hook.address) {
          console.log("Address missmatch, skipping");
          return;
        }
      }

      if (status != hook.status) {
        // console.log("Dispatching action for a webhook", JSON.stringify(hook));

        // get transactions
        const history: Tx[] = await this.connection.networkProvider.getHistory(hook.address);
        // console.log("Got history", history);
        // figure out which transactions to send to the hook
        let txs: Tx[] = []
        const idx: number = history.findIndex(val => val.tx_hash === hook.last_tx);
        if (idx >= 0) {
          // send all after last tracked
          txs = history.slice(idx + 1, -1);
        } else {
          // send the last only if no tracking was done
          txs = history.slice(-1);
        }

        let shouldUpdateStatus: boolean = true;
        let hookCallFailed: boolean = false;

        for (const tx of txs) {
          // console.log("Getting raw tx", tx.tx_hash);
          const rawTx: any = await this.connection.networkProvider.getRawTransactionObject(tx.tx_hash);
          const parentTxs:any[] = await Promise.all(rawTx.vin.map(t => this.connection.networkProvider.getRawTransactionObject(t.txid)));
          // console.log("Got raw tx", JSON.stringify(rawTx, null, 2));
          const haveAddressInOutputs: boolean = rawTx.vout.some(val => val.scriptPubKey.addresses.includes(hook.address));
          const haveAddressInParentOutputs: boolean = parentTxs.some(parent => parent.vout.some(val => val.scriptPubKey.addresses.includes(hook.address)));

          const wantsIn: boolean = hook.type.indexOf("in") >= 0;
          const wantsOut: boolean = hook.type.indexOf("out") >= 0;

          const txDirection: string = haveAddressInParentOutputs && haveAddressInOutputs ? "transaction:in,out" :
            haveAddressInParentOutputs ? "transaction:out" : "transaction:in";

          let result: boolean = false;
          if (wantsIn && haveAddressInOutputs) {
            result = await this.postWebHook(hook.hook_url, txDirection, rawTx);
          } else if (wantsOut && haveAddressInParentOutputs) {
            result = await this.postWebHook(hook.hook_url, txDirection, rawTx);
          } else {
            // not interested in this transaction
            continue;
          }

          if (!result) {
            console.log("Failed to execute webhook", hook, rawTx);
            shouldUpdateStatus = false;
            hookCallFailed = true;
          }

          hook.last_tx = tx.tx_hash;
          await this.db.setWebHookLastTx(hook.id!, tx.tx_hash);
        }

        if (shouldUpdateStatus) {
          hook.status = status;
          await this.db.setWebHookStatus(hook.id!, status);
        }

        if (hook.recurrence === "once" && !hookCallFailed) {
          await this.stopHook(hook);
          await this.db.deleteWebHook(hook.id!);
        }
      }
    }

    this.callbacks.set(hook.id!, callback);
    await this.connection.networkProvider.subscribeToAddress(hook.address, callback);
  }

  async stop(): Promise<void> {
    for (const [key, hook] of this.activeHooks) {
      await this.stopHook(hook);
    }
  }

  async stopHook(hook: WebHookI): Promise<void> {
    if (this.activeHooks.has(hook.id!)) {
      await this.connection.networkProvider.unsubscribeFromAddress(hook.address, this.callbacks.get(hook.id!)!);
      this.activeHooks.delete(hook.id!);
      this.callbacks.delete(hook.id!);
    }
  }

  async postWebHook(url: string, direction: string, data: any): Promise<boolean> {
    try {
      await axios.post(url, { direction: direction, tx: data });
      console.log("Posted webhook", url, direction);
      return true;
    } catch (e) {
      console.log("Failed to post webhook", url);
      return false;
    }
  }
}