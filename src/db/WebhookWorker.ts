import { default as SqlProvider } from "../db/SqlProvider";
import { WebHookI } from "../db/interface";

import { Network } from "../interface";
import { Connection } from "../network/Connection";

const axios = require('axios').default

export default class WebhookWorker {
  activeHooks: Map<number, object> = new Map();
  callbacks: Map<number, object> = new Map();
  connection: any;
  db: any;
  network: any;

  constructor(network: Network = Network.MAINNET) {
    this.network = network;
  }

  async init(): Promise<void> {
    this.connection = new Connection(this.network);
    await this.connection.ready();

    this.db = new SqlProvider(this.network);
    await this.db.init();

    await this.evictOldHooks();
    setTimeout(async() => {
      await this.evictOldHooks();
    }, 5*60*1000);

    let hooks = await this.db.getWebHooks();
    for (let hook of hooks) {
      this.activeHooks.set(hook.id, hook);
    }
  }

  async destroy(): Promise<void> {
    await this.stop();
    await this.connection.disconnect();
    await this.db.close();
  }

  async evictOldHooks(): Promise<void> {
    let hooks = await this.db.getWebHooks();
    for (let hook of hooks) {
      if (new Date() >= hook.expires_at) {
        console.log("Evicting expired hook with id", hook.id);
        await this.stopHook(hook);
        await this.db.deleteWebHook(hook.id);
      }
    }
  }

  async start(): Promise<void> {
    for (let [key, hook] of this.activeHooks) {
      this.startHook(hook);
    }
  }

  async startHook(hook: any): Promise<void> {
    let callback = async (data) => {
      console.log(data);
      let status = "";
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
        let history = await this.connection.networkProvider.getHistory(hook.address);
        // console.log("Got history", history);
        // figure out which transactions to send to the hook
        let txs: any[] = []
        let idx = history.indexOf(hook.last_tx);
        if (idx >= 0) {
          // send all after last tracked
          txs = history.slice(idx + 1, -1);
        } else {
          // send the last only if no tracking was done
          txs = history.slice(-1);
        }

        let shouldUpdateStatus = true;
        let hookCallFailed = false;

        for (const tx of txs) {
          // console.log("Getting raw tx", tx.tx_hash);
          let rawTx = await this.connection.networkProvider.getRawTransactionObject(tx.tx_hash);
          let parentTxs:any[] = await Promise.all(rawTx.vin.map(t => this.connection.networkProvider.getRawTransactionObject(t.txid)));
          // console.log("Got raw tx", JSON.stringify(rawTx, null, 2));
          let haveAddressInOutputs = rawTx.vout.some(val => val.scriptPubKey.addresses.includes(hook.address));
          let haveAddressInParentOutputs = parentTxs.some(parent => parent.vout.some(val => val.scriptPubKey.addresses.includes(hook.address)));

          let wantsIn = hook.type.indexOf("in") >= 0;
          let wantsOut = hook.type.indexOf("out") >= 0;

          let txDirection = haveAddressInParentOutputs && haveAddressInOutputs ? "transaction:in,out" :
            haveAddressInParentOutputs ? "transaction:out" : "transaction:in";

          let result = false;
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
          await this.db.setWebHookLastTx(hook.id, tx.tx_hash);
        }

        if (shouldUpdateStatus) {
          hook.status = status;
          await this.db.setWebHookStatus(hook.id, status);
        }

        if (hook.recurrence === "once" && !hookCallFailed) {
          await this.stopHook(hook);
          await this.db.deleteWebHook(hook.id);
        }
      }
    }

    await this.connection.networkProvider.subscribeToAddress(hook.address, callback);
    this.callbacks.set(hook.id, callback);
  }

  async stop(): Promise<void> {
    for (let hook of this.activeHooks) {
      await this.stopHook(hook);
    }
  }

  async stopHook(hook: any): Promise<void> {
    if (this.activeHooks.has(hook.id)) {
      await this.connection.networkProvider.unsubscribeFromAddress(hook.address, this.callbacks.get(hook.id));
      this.activeHooks.delete(hook.id);
      this.callbacks.delete(hook.id);
    }
  }

  async postWebHook(url, direction, data): Promise<boolean> {
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
