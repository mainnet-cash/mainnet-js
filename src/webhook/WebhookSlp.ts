import { GsppTx, SlpDbProvider, SlpDbTx, SlpTxI } from "../slp";
import {
  SlpCancelWatchFn,
  SlpWatchTransactionCallback,
} from "../slp/SlpProvider";
import { isSameAddress, toSlpAddress } from "../util/bchaddr";
import { Wallet } from "../wallet/Wif";
import { Webhook, WebhookRecurrence, WebhookType } from "./Webhook";
import WebhookWorker from "./WebhookWorker";

export class WebhookSlp extends Webhook {
  callback!: SlpWatchTransactionCallback;
  cancelFn!: SlpCancelWatchFn;
  wallet!: Wallet;

  constructor(hook: Webhook | Object) {
    super(hook);
    Object.assign(this, hook);
    this.cashaddr = toSlpAddress(this.cashaddr);
  }

  async start(): Promise<void> {
    const webhookCallback: SlpWatchTransactionCallback = async (
      rawTx: SlpTxI
    ) => {
      let result = false;
      if (this.wallet.slp.provider instanceof SlpDbProvider) {
        result = await this.slpDbHandler(rawTx);
      } else {
        result = await this.gsppHandler(rawTx);
      }

      if (result && this.recurrence === WebhookRecurrence.once) {
        // we have to notify the worker about end of life
        await (await WebhookWorker.instance()).stopHook(this);
        await this.destroy();
      }
    };

    this.callback = webhookCallback;
    this.wallet = await Wallet.fromSlpaddr(this.cashaddr);
    this.cancelFn = this.wallet.slp.watchTransactions(
      webhookCallback,
      this.tokenId
    );
  }

  async slpDbHandler(rawTx: SlpTxI) {
    let result: boolean = false;
    const txDirection = this.type;
    const details: SlpDbTx = rawTx.details as SlpDbTx;
    if (this.type === WebhookType.slpTransactionInOut) {
      result = await this.post({
        direction: txDirection,
        data: rawTx,
      });
    } else if (
      this.type === WebhookType.slpTransactionIn &&
      details.out.some((val) => isSameAddress(val.e.a, this.cashaddr))
    ) {
      result = await this.post({
        direction: txDirection,
        data: rawTx,
      });
    } else if (
      this.type === WebhookType.slpTransactionOut &&
      details.in.some((val) => isSameAddress(val.e.a, this.cashaddr))
    ) {
      result = await this.post({
        direction: txDirection,
        data: rawTx,
      });
    } else if (this.type === WebhookType.slpBalance) {
      const balance = this.wallet.slp.getBalance(this.tokenId!);
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
    console.log(
      "gsppHandler slpTransactionInOut",
      rawTx,
      txDirection,
      this.wallet.cashaddr,
      this.cashaddr
    );
    if (this.type === WebhookType.slpTransactionInOut) {
      result = await this.post({
        direction: txDirection,
        data: rawTx,
      });
    } else if (
      this.type === WebhookType.slpTransactionIn &&
      details.outputs.some((val) => isSameAddress(val, this.cashaddr))
    ) {
      result = await this.post({
        direction: txDirection,
        data: rawTx,
      });
    } else if (
      this.type === WebhookType.slpTransactionOut &&
      details.inputs.some((val) => isSameAddress(val, this.cashaddr))
    ) {
      result = await this.post({
        direction: txDirection,
        data: rawTx,
      });
    } else if (this.type === WebhookType.slpBalance) {
      const balance = this.wallet.slp.getBalance(this.tokenId!);
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
}
