import { toSlpAddress } from "bchaddrjs-slp";
import { GsppTx, SlpDbTx, SlpTxI } from "../slp";
import { SlpCancelWatchFn, SlpWatchTransactionCallback } from "../slp/SlpProvider";
import { Wallet } from "../wallet/Wif";
import { WebhookI } from "./interface";
import { Webhook, WebhookRecurrence } from "./Webhook";
import WebhookWorker from "./WebhookWorker";

export class WebhookSlp extends Webhook {
  callback!: SlpWatchTransactionCallback;
  cancelFn!: SlpCancelWatchFn;
  wallet!: Wallet;

  constructor(hook: WebhookI | Object) {
    super(hook);
    Object.assign(this, hook);
    this.cashaddr = toSlpAddress(this.cashaddr);
  }

  async start(): Promise<void> {
    const webhookCallback: SlpWatchTransactionCallback = async (tx: SlpTxI) => {
      let result = false;
      if ("blk" in tx.details) {
        result = await this.slpDbHandler(tx);
      } else {
        result = await this.gsppHandler(tx);
      }

      if (result && this.recurrence === WebhookRecurrence.once) {
        // we have to notify the worker about end of life
        await (await WebhookWorker.instance()).stopHook(this);
        await this.destroy();
      }
    };

    this.callback = webhookCallback;
    this.wallet = await Wallet.fromSlpaddr(this.cashaddr);
    this.cancelFn = this.wallet.slp.watchTransactions(webhookCallback, this.tokenId);
  }

  async slpDbHandler(rawTx: SlpTxI) {
    let result: boolean = false;
    const txDirection = this.type;
    const details: SlpDbTx = rawTx.details as SlpDbTx;
    if (this.type === "slptransaction:in,out") {
      result = await this.post({
        direction: txDirection,
        data: rawTx,
      });
    } else if (this.type === "slptransaction:in" && details.in.findIndex(val => val.e.a === this.cashaddr) > -1) {
      result = await this.post({
        direction: txDirection,
        data: rawTx,
      });
    } else if (this.type === "slptransaction:out" && details.out.findIndex(val => val.e.a === this.cashaddr) > -1) {
      result = await this.post({
        direction: txDirection,
        data: rawTx,
      });
    } else if (this.type === "slpbalance") {
      const balance = this.wallet.slp.getBalance(this.tokenId);
      result = await this.post({
        direction: txDirection,
        data: balance,
      });
    }

    return result;
  }

  async gsppHandler(rawTx: SlpTxI) {
    let result: boolean = false;
    const txDirection = this.type;
    const details: GsppTx = rawTx.details as GsppTx;
    if (this.type === "slptransaction:in,out") {
      result = await this.post({
        direction: txDirection,
        data: rawTx,
      });
    } else if (this.type === "slptransaction:in" && details.inputs.findIndex(val => val === this.cashaddr) > -1) {
      result = await this.post({
        direction: txDirection,
        data: rawTx,
      });
    } else if (this.type === "slptransaction:out" && details.outputs.findIndex(val => val === this.cashaddr) > -1) {
      result = await this.post({
        direction: txDirection,
        data: rawTx,
      });
    } else if (this.type === "slpbalance") {
      const balance = this.wallet.slp.getBalance(this.tokenId);
      result = await this.post({
        direction: txDirection,
        data: balance,
      });
    }

    return result;
  }

  async stop(): Promise<void> {
    await this.cancelFn();
  }

  async destroy(): Promise<void> {
  }
}