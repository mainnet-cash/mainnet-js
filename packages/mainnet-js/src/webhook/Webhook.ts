import SqlProvider from "../db/SqlProvider";
import { TxI } from "../interface";
import { instantiateSha256, utf8ToBin, binToBase64 } from "@bitauth/libauth";
import { getRuntimePlatform } from "../util";

const axios = require("axios").default;

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
  signature?: string;
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
      console.log(data);
      if (getRuntimePlatform() === "node") {
        data.signature = await this.getSig(data);
      }
      console.log(data);
      await axios.post(this.url, data);
      console.debug("Posted webhook", this.url, data);
      return true;
    } catch (e: any) {
      if (e.message && e.message.status === 200) {
        return true;
      }

      console.debug("Failed to post webhook", this.url, e);
      return false;
    }
  }

  async getSig(data: any): Promise<string> {
    let msg = JSON.stringify(data, Object.keys(data).sort());
    let keyedMsgBytes = utf8ToBin(process.env.API_KEY + msg);
    const sha256 = await instantiateSha256();
    let sig = "sha256=" + binToBase64(sha256.hash(keyedMsgBytes));
    return sig;
  }

  //#region debug
  public static debug = class {
    static setupAxiosMocks() {
      axios.interceptors.request.use((config) => {
        const url = config.url!;
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
