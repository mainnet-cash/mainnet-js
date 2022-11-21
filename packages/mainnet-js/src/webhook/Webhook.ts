import SqlProvider from "../db/SqlProvider.js";
import { TxI } from "../interface.js";

import axios from "axios";

export enum WebhookType {
  transactionIn = "transaction:in",
  transactionOut = "transaction:out",
  transactionInOut = "transaction:in,out",
  balance = "balance",

  slpTransactionIn = "slptransaction:in",
  slpTransactionOut = "slptransaction:out",
  slpTransactionInOut = "slptransaction:in,out",
  slpBalance = "slpbalance",
}

export enum WebhookRecurrence {
  once = "once",
  recurrent = "recurrent",
}

export class Webhook {
  id?: number;
  cashaddr!: string; // depending on type of the hook, either cashaddr or slpaddr
  type!: string;
  recurrence!: string;
  url!: string;
  status!: string; // bch only
  last_height!: number; // bch only
  tx_seen!: TxI[]; // bch only
  tokenId?: string; // slp only
  expires_at!: Date;

  db!: SqlProvider;

  constructor(hook: Webhook | Object) {
    Object.assign(this, hook);
  }

  // abstract, empty implementation
  async start(): Promise<void> {}

  // abstract, empty implementation
  async stop(): Promise<void> {}

  async destroy(): Promise<void> {
    if (this.id) {
      await this.db.deleteWebhook(this.id);
    }
  }

  async post(data: any): Promise<boolean> {
    try {
      await axios.post(this.url, data);
      // console.debug("Posted webhook", this.url, data);
      return true;
    } catch (e: any) {
      if (e.message && e.message.status === 200) {
        return true;
      }

      // console.debug("Failed to post webhook", this.url, e);
      return false;
    }
  }

  //#region debug
  public static debug = class {
    static setupAxiosMocks() {
      axios.interceptors.request.use((config) => {
        const url = config.url!;
        if (!url.startsWith("http://example.com")) {
          return config;
        }

        let response;
        if (url === "http://example.com/fail") {
          response = { status: 503 };
        } else {
          response = { status: 200 };
        }

        if (url in this.responses) {
          this.responses[url].push(response);
        } else {
          this.responses[url] = [response];
        }

        // cancel actual http request
        return {
          ...config,
          cancelToken: new axios.CancelToken((cancel) => cancel(response)),
        };
      });
    }

    static reset() {
      this.responses = {};
    }

    static responses: any = {};
  };
  //#endregion
}
