import { TxI } from "mainnet-js";
import SqlProvider from "../SqlProvider.js";

export enum WebhookType {
  transactionIn = "transaction:in",
  transactionOut = "transaction:out",
  transactionInOut = "transaction:in,out",
  balance = "balance",
}

export enum WebhookRecurrence {
  once = "once",
  recurrent = "recurrent",
}

export class Webhook {
  id?: number;
  cashaddr!: string;
  type!: string;
  recurrence!: string;
  url!: string;
  status!: string;
  last_height!: number;
  tx_seen!: TxI[];
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
      const res = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return false;
      return true;
    } catch {
      return false;
    }
  }

}
