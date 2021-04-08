import { default as SqlProvider } from "../db/SqlProvider";
import { RegisterWebhookParams, WebhookI } from "./interface";

import { Network, TxI } from "../interface";
import { balanceResponseFromSatoshi } from "../util/balanceObjectFromSatoshi";
import { ElectrumRawTransaction } from "../network/interface";
import { Wallet } from "../wallet/Wif";

const axios = require("axios").default;

export default class WebhookWorker {
  activeHooks: Map<number, WebhookI> = new Map();
  callbacks: Map<
    number,
    (data: any | string | Array<string>) => void
  > = new Map();
  db: SqlProvider;
  interval: any = undefined;
  seenStatuses: string[] = [];

  private static _instance: WebhookWorker;

  static async instance() {
    if (!WebhookWorker._instance) {
      WebhookWorker._instance = new WebhookWorker();
      await WebhookWorker._instance.init();
    }

    return WebhookWorker._instance;
  }

  constructor(network: Network = Network.MAINNET) {
    this.db = new SqlProvider(network);
  }

  async init(): Promise<void> {
    await this.db.init();

    await this.evictOldHooks();
    await this.pickupHooks(true);
    if (!this.interval) {
      this.interval = setInterval(async () => {
        await this.evictOldHooks();
        await this.pickupHooks(true);
      }, 5 * 60 * 1000);
    }
  }

  async destroy(): Promise<void> {
    this.seenStatuses = [];
    await this.stop();
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  async pickupHooks(start: boolean = false): Promise<void> {
    const hooks: WebhookI[] = await this.db.getWebhooks();
    for (const hook of hooks) {
      if (!this.activeHooks.has(hook.id!)) {
        this.activeHooks.set(hook.id!, hook);
        if (start) {
          await this.startHook(hook);
        }
      }
    }
  }

  async evictOldHooks(): Promise<void> {
    const hooks: WebhookI[] = await this.db.getWebhooks();
    for (const hook of hooks) {
      if (new Date() >= hook.expires_at) {
        // console.debug("Evicting expired hook with id", hook.id, new Date(), hook.expires_at);
        await this.stopHook(hook);
        await this.db.deleteWebhook(hook.id!);
      }
    }
  }

  async registerWebhook(
    params: RegisterWebhookParams,
    start: boolean = true
  ): Promise<number> {
    const webhook = await this.db.addWebhook(
      params.cashaddr,
      params.url,
      params.type,
      params.recurrence,
      params.duration_sec
    );
    if (start) {
      this.activeHooks.set(webhook.id!, webhook);
      await this.startHook(webhook);
    }
    return webhook.id!;
  }

  async getWebhook(id: number): Promise<WebhookI | undefined> {
    if (this.activeHooks.has(id)) {
      return this.activeHooks.get(id)!;
    }

    return await this.db.getWebhook(id);
  }

  async deleteWebhook(id: number): Promise<void> {
    if (this.activeHooks.has(id)) {
      await this.stopHook(this.activeHooks.get(id)!);
    }
    await this.db.deleteWebhook(id);
  }

  async deleteAllWebhooks(): Promise<void> {
    await this.stop();
    await this.db.clearWebhooks();
  }

  async startHook(hook: WebhookI): Promise<void> {
    const wallet = await Wallet.fromCashaddr(hook.cashaddr);
    const stopHookCalback = async () => {
      await wallet.provider!.unsubscribeFromAddress(
        hook.cashaddr,
        this.callbacks.get(hook.id!)!
      );
    }
    hook.stopCallback = stopHookCalback;

    const webhookCallback = async (data: string | Array<string>) => {
      // console.debug(data);
      let status: string = "";
      if (typeof data === "string") {
        // subscription acknowledgement notification with current status
        status = data;

        // we should skip fetching transactions for freshly registered hooks upon acknowledements
        if (hook.status === "") {
          return;
        }
      } else if (data instanceof Array) {
        status = data[1];
        if (data[0] !== hook.cashaddr) {
          // console.warn("Address missmatch, skipping", data[0], hook.cashaddr);
          return;
        }
      } else {
        return;
      }

      if (status != hook.status && this.seenStatuses.indexOf(status) === -1) {
        this.seenStatuses.push(status);
        await this.webhookHandler(hook, status);
      }
    };

    this.callbacks.set(hook.id!, webhookCallback);
    await wallet.provider!.subscribeToAddress(hook.cashaddr, webhookCallback);
  }

  async webhookHandler(hook: WebhookI, status: string): Promise<void> {
    // console.debug("Dispatching action for a webhook", JSON.stringify(hook));

    const wallet = await Wallet.fromCashaddr(hook.cashaddr);

    // get transactions
    const history: TxI[] = await wallet.provider!.getHistory(hook.cashaddr);

    // figure out which transactions to send to the hook
    let txs: TxI[] = [];

    if (status === "") {
      // send the last transaction only if no tracking was done
      txs = history.slice(-1);
    } else {
      // reverse history for faster search
      const revHistory = history.reverse();
      // update height of transactions, which are now confirmed
      hook.tx_seen = hook.tx_seen.map((seenTx) => {
        if (seenTx.height <= 0) {
          const histTx = revHistory.find(
            (val) => val.tx_hash === seenTx.tx_hash
          );
          if (histTx) {
            seenTx.height = histTx.height;
          }
        }
        return seenTx;
      });

      const seenHashes = hook.tx_seen.map((val) => val.tx_hash);
      txs = history.filter(
        (val) =>
          (val.height >= hook.last_height || val.height <= 0) &&
          !seenHashes.includes(val.tx_hash)
      );
    }

    let shouldUpdateStatus: boolean = true;

    for (const tx of txs) {
      // watching transactions
      let result: boolean = false;

      if (hook.type.indexOf("transaction:") >= 0) {
        // console.debug("Getting raw tx", tx.tx_hash);
        const rawTx: ElectrumRawTransaction = await wallet.provider!.getRawTransactionObject(
          tx.tx_hash
        );
        const parentTxs: ElectrumRawTransaction[] = await Promise.all(
          rawTx.vin.map((t) => wallet.provider!.getRawTransactionObject(t.txid))
        );
        // console.debug("Got raw tx", JSON.stringify(rawTx, null, 2));
        const haveAddressInOutputs: boolean = rawTx.vout.some((val) =>
          val.scriptPubKey.addresses.includes(hook.cashaddr)
        );
        const haveAddressInParentOutputs: boolean = parentTxs.some((parent) =>
          parent.vout.some((val) =>
            val.scriptPubKey.addresses.includes(hook.cashaddr)
          )
        );

        const wantsIn: boolean = hook.type.indexOf("in") >= 0;
        const wantsOut: boolean = hook.type.indexOf("out") >= 0;

        const txDirection: string =
          haveAddressInParentOutputs && haveAddressInOutputs
            ? "transaction:in,out"
            : haveAddressInParentOutputs
            ? "transaction:out"
            : "transaction:in";

        if (wantsIn && haveAddressInOutputs) {
          result = await this.postWebHook(hook.hook_url, {
            direction: txDirection,
            data: rawTx,
          });
        } else if (wantsOut && haveAddressInParentOutputs) {
          result = await this.postWebHook(hook.hook_url, {
            direction: txDirection,
            data: rawTx,
          });
        } else {
          // not interested in this transaction
          continue;
        }
      } else if (hook.type.indexOf("balance") >= 0) {
        // watching address balance
        const balanceSat = await wallet.provider!.getBalance(hook.cashaddr);
        const balanceObject = await balanceResponseFromSatoshi(balanceSat);
        result = await this.postWebHook(hook.hook_url, balanceObject);
      }

      if (result) {
        hook.tx_seen.push(tx);
        await this.db.setWebhookSeenTxLastHeight(
          hook.id!,
          hook.tx_seen,
          hook.last_height
        );
      } else {
        // console.debug("Failed to execute webhook", hook);
        shouldUpdateStatus = false;
      }
    }

    // successful run
    if (shouldUpdateStatus) {
      if (hook.recurrence === "once") {
        await this.stopHook(hook);
        await this.deleteWebhook(hook.id!);
        return;
      }

      hook.status = status;
      await this.db.setWebhookStatus(hook.id!, status);

      // update last_height and truncate tx_seen
      const maxHeight = Math.max(...hook.tx_seen.map((val) => val.height));
      if (maxHeight >= hook.last_height) {
        hook.last_height = maxHeight;
        hook.tx_seen = hook.tx_seen.filter(
          (val) => val.height === maxHeight || val.height <= 0
        );
        await this.db.setWebhookSeenTxLastHeight(
          hook.id!,
          hook.tx_seen,
          hook.last_height
        );
      }
    }
  }

  async stop(): Promise<void> {
    for (const [, hook] of this.activeHooks) {
      await this.stopHook(hook);
    }
  }

  async stopHook(hook: WebhookI): Promise<void> {
    if (this.activeHooks.has(hook.id!)) {
      await hook.stopCallback!();
      this.activeHooks.delete(hook.id!);
      this.callbacks.delete(hook.id!);
    }
  }

  async postWebHook(url: string, data: any): Promise<boolean> {
    try {
      await axios.post(url, data);
      // console.debug("Posted webhook", url, data);
      return true;
    } catch (e) {
      // console.debug("Failed to post webhook", url);
      return false;
    }
  }

  public static debug = class {
    static setupAxiosMocks() {
      axios.interceptors.request.use((config) => {
        if (config.url!.indexOf("example.com")) {
          config.url = "x" + config.url!;
        }
        return config;
      });

      axios.interceptors.response.use(
        (response) => {
          return response;
        },
        (error) => {
          let url = error.config.url!.slice(1);

          if (url in this.responses) {
            this.responses[url].push(error);
          } else {
            this.responses[url] = [error];
          }

          if (url === "http://example.com/fail")
            return Promise.reject({ status: 503 });

          return Promise.resolve({ status: 200 });
        }
      );
    }

    static reset() {
      this.responses = {};
    }

    static responses: any = {};
  }
}
