import SqlProvider from "../db/SqlProvider.js";
import { TxI } from "../interface.js";
import { ElectrumRawTransaction } from "../network/interface.js";
import { balanceResponseFromSatoshi } from "../util/balanceObjectFromSatoshi.js";
import { Wallet } from "../wallet/Wif.js";
import { Webhook, WebhookRecurrence, WebhookType } from "./Webhook.js";
import WebhookWorker from "./WebhookWorker.js";

export class WebhookBch extends Webhook {
  callback!: (data: any | string | Array<string>) => void;
  wallet!: Wallet;

  db!: SqlProvider;
  seenStatuses: string[] = [];

  constructor(hook: Webhook | Object) {
    super(hook);
    Object.assign(this, hook);
  }

  async stop(): Promise<void> {
    await this.wallet.provider!.unsubscribeFromAddress(
      this.cashaddr,
      this.callback
    );
  }

  async start(): Promise<void> {
    const webhookCallback = async (data: string | Array<string>) => {
      let status: string = "";
      if (typeof data === "string") {
        // subscription acknowledgement notification with current status
        status = data;

        // we should skip fetching transactions for freshly registered hooks upon acknowledements
        if (this.status === "") {
          return;
        }
      } else if (data instanceof Array) {
        status = data[1];
        if (data[0] !== this.cashaddr) {
          // console.warn("Address missmatch, skipping", data[0], this.cashaddr);
          return;
        }
      } else {
        return;
      }

      if (status != this.status && this.seenStatuses.indexOf(status) === -1) {
        this.seenStatuses.push(status);
        await this.handler(status);
      }
    };

    this.callback = webhookCallback;
    this.wallet = await Wallet.fromCashaddr(this.cashaddr);
    await this.wallet.provider!.subscribeToAddress(
      this.cashaddr,
      this.callback
    );
  }

  async handler(status: string): Promise<void> {
    // console.debug("Dispatching action for a webhook", this);
    // get transactions
    const history: TxI[] = await this.wallet.provider!.getHistory(
      this.cashaddr
    );

    // figure out which transactions to send to the hook
    let txs: TxI[] = [];

    if (status === "") {
      // send the last transaction only if no tracking was done
      txs = history.slice(-1);
    } else {
      // reverse history for faster search
      const revHistory = history.reverse();
      // update height of transactions, which are now confirmed
      this.tx_seen = this.tx_seen.map((seenTx) => {
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

      const seenHashes = this.tx_seen.map((val) => val.tx_hash);
      txs = history.filter(
        (val) =>
          (val.height >= this.last_height || val.height <= 0) &&
          !seenHashes.includes(val.tx_hash)
      );
    }

    let shouldUpdateStatus: boolean = true;

    for (const tx of txs) {
      // watching transactions
      let result: boolean = false;

      if (this.type.indexOf("transaction:") >= 0) {
        // console.debug("Getting raw tx", tx.tx_hash);
        const rawTx: ElectrumRawTransaction =
          await this.wallet.provider!.getRawTransactionObject(tx.tx_hash);
        const parentTxs: ElectrumRawTransaction[] = await Promise.all(
          rawTx.vin.map((t) =>
            this.wallet.provider!.getRawTransactionObject(t.txid)
          )
        );
        // console.debug("Got raw tx", JSON.stringify(rawTx, null, 2));
        const haveAddressInOutputs: boolean = rawTx.vout.some((val) =>
          val.scriptPubKey.addresses.includes(this.cashaddr)
        );
        const haveAddressInParentOutputs: boolean = parentTxs.some((parent) =>
          parent.vout.some((val) =>
            val.scriptPubKey.addresses.includes(this.cashaddr)
          )
        );

        const wantsIn: boolean = this.type.indexOf("in") >= 0;
        const wantsOut: boolean = this.type.indexOf("out") >= 0;

        const txDirection: string =
          haveAddressInParentOutputs && haveAddressInOutputs
            ? WebhookType.transactionInOut
            : haveAddressInParentOutputs
            ? WebhookType.transactionOut
            : WebhookType.transactionIn;

        if (wantsIn && haveAddressInOutputs) {
          result = await this.post({
            direction: txDirection,
            data: rawTx,
          });
        } else if (wantsOut && haveAddressInParentOutputs) {
          result = await this.post({
            direction: txDirection,
            data: rawTx,
          });
        } else {
          // not interested in this transaction
          continue;
        }
      } else if (this.type === WebhookType.balance) {
        // watching address balance
        const balanceSat = await this.wallet.provider!.getBalance(
          this.cashaddr
        );
        const balanceObject = await balanceResponseFromSatoshi(balanceSat);
        result = await this.post(balanceObject);
      }

      if (result) {
        this.tx_seen.push(tx);
        await this.db.setWebhookSeenTxLastHeight(
          this.id!,
          this.tx_seen,
          this.last_height
        );
      } else {
        // console.debug("Failed to execute webhook", hook);
        shouldUpdateStatus = false;
      }
    }

    // successful run
    if (shouldUpdateStatus) {
      if (this.recurrence === WebhookRecurrence.once) {
        // we have to notify the worker about end of life
        await (await WebhookWorker.instance()).stopHook(this);
        await this.destroy();
        return;
      }

      this.status = status;
      await this.db.setWebhookStatus(this.id!, status);

      // update last_height and truncate tx_seen
      const maxHeight = Math.max(...this.tx_seen.map((val) => val.height));
      if (maxHeight >= this.last_height) {
        this.last_height = maxHeight;
        this.tx_seen = this.tx_seen.filter(
          (val) => val.height === maxHeight || val.height <= 0
        );
        await this.db.setWebhookSeenTxLastHeight(
          this.id!,
          this.tx_seen,
          this.last_height
        );
      }
    }
  }
}
