import WebhookWorker from "../webhook/WebhookWorker";
import { RegTestWallet } from "../wallet/Wif";
import { mine } from "../mine/mine";
import { Webhook, WebhookRecurrence, WebhookType } from "./Webhook";

let worker: WebhookWorker;
let alice;
let aliceWif;

/**
 * @jest-environment jsdom
 */
describe("Webhook worker tests", () => {
  beforeAll(async () => {
    try {
      if (process.env.PRIVATE_WIF) {
        alice = process.env.ADDRESS!;
        aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;
      } else {
        console.error("regtest env vars not set");
      }

      Webhook.debug.setupAxiosMocks();
      worker = await WebhookWorker.instance();
    } catch (e: any) {
      throw e;
    }
  });

  beforeEach(async () => {
    worker.deleteAllWebhooks();
  });

  afterEach(async () => {
    Webhook.debug.reset();
  });

  afterAll(async () => {
    await worker.destroy();
    await worker.db.close();
  });

  test("Test non-recurrent hook to be deleted after successful call", async () => {
    try {
      const aliceWallet = await RegTestWallet.fromId(aliceWif);
      const bobWallet = await RegTestWallet.newRandom();
      await worker.registerWebhook({
        cashaddr: bobWallet.cashaddr!,
        url: "http://example.com/success",
        type: WebhookType.transactionIn,
        recurrence: WebhookRecurrence.once,
      });

      await Promise.all([
        aliceWallet.send([
          {
            cashaddr: bobWallet.cashaddr!,
            value: 1000,
            unit: "satoshis",
          },
        ]),
        bobWallet.waitForTransaction(),
      ]);

      // return funds
      // let sendResponse2 = await bobWallet.sendMax(aliceWallet.cashaddr!);

      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(
            Webhook.debug.responses["http://example.com/success"].length
          ).toBe(1);
          expect(worker.activeHooks.size).toBe(0);

          resolve(true);
        }, 3000)
      );
    } catch (e: any) {
      console.log(e, e.stack, e.message);
      throw e;
    }
  });

  test("Test non-recurrent hook to be not deleted after failed call", async () => {
    try {
      const aliceWallet = await RegTestWallet.fromId(aliceWif);
      const bobWallet = await RegTestWallet.newRandom();
      await worker.registerWebhook({
        cashaddr: bobWallet.cashaddr!,
        url: "http://example.com/fail",
        type: WebhookType.transactionIn,
        recurrence: WebhookRecurrence.once,
      });

      await Promise.all([
        aliceWallet.send([
          {
            cashaddr: bobWallet.cashaddr!,
            value: 1000,
            unit: "satoshis",
          },
        ]),
        bobWallet.waitForTransaction(),
      ]);

      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(
            Webhook.debug.responses["http://example.com/fail"].length
          ).toBe(1);
          expect(worker.activeHooks.size).toBe(1);

          // return funds
          // let sendResponse2 = await bobWallet.sendMax(aliceWallet.cashaddr!);
          resolve(true);
        }, 3000)
      );
    } catch (e: any) {
      console.log(e, e.stack, e.message);
      throw e;
    }
  });

  test("Test recurrent hook for incoming transaction", async () => {
    try {
      const aliceWallet = await RegTestWallet.fromId(aliceWif);
      const bobWallet = await RegTestWallet.newRandom();
      await worker.registerWebhook({
        cashaddr: bobWallet.cashaddr!,
        url: "http://example.com/bob",
        type: WebhookType.transactionIn,
        recurrence: WebhookRecurrence.recurrent,
      });

      await Promise.all([
        aliceWallet.send([
          {
            cashaddr: bobWallet.cashaddr!,
            value: 1000,
            unit: "satoshis",
          },
        ]),
        bobWallet.waitForTransaction(),
      ]);

      // return funds
      // let sendResponse2 = await bobWallet.sendMax(aliceWallet.cashaddr!);

      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(Webhook.debug.responses["http://example.com/bob"].length).toBe(
            1
          );
          expect(worker.activeHooks.size).toBe(1);

          resolve(true);
        }, 3000)
      );
    } catch (e: any) {
      console.log(e, e.stack, e.message);
      throw e;
    }
  });

  test("Test recurrent hook for outgoing transactions", async () => {
    try {
      const aliceWallet = await RegTestWallet.fromId(aliceWif);
      const bobWallet = await RegTestWallet.newRandom();
      await worker.registerWebhook({
        cashaddr: bobWallet.cashaddr!,
        url: "http://example.com/bob",
        type: WebhookType.transactionOut,
        recurrence: WebhookRecurrence.recurrent,
      });

      await Promise.all([
        aliceWallet.send([
          {
            cashaddr: bobWallet.cashaddr!,
            value: 1000,
            unit: "satoshis",
          },
        ]),
        bobWallet.waitForTransaction(),
      ]);

      // return funds
      await Promise.all([
        bobWallet.sendMax(aliceWallet.cashaddr!),
        aliceWallet.waitForTransaction(),
      ]);

      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(Webhook.debug.responses["http://example.com/bob"].length).toBe(
            1
          );
          expect(worker.activeHooks.size).toBe(1);

          resolve(true);
        }, 3000)
      );
    } catch (e: any) {
      console.log(e, e.stack, e.message);
      throw e;
    }
  });

  test("Test should pickup transactions happened while offline", async () => {
    try {
      const aliceWallet = await RegTestWallet.fromId(aliceWif);
      const bobWallet = await RegTestWallet.newRandom();
      const minerWallet = await RegTestWallet.newRandom();
      const hookId = await worker.registerWebhook({
        cashaddr: bobWallet.cashaddr!,
        url: "http://example.com/bob",
        type: WebhookType.transactionIn,
        recurrence: WebhookRecurrence.recurrent,
      });

      // initial transaction
      await aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
      ]);

      // wait worker to process, updating the status of the hook
      await new Promise((resolve) => setTimeout(resolve, 5000));

      let hook = await worker.getWebhook(hookId);
      expect(hook!.status).not.toBe("");
      expect(hook!.tx_seen).not.toBe([]);
      hook!.tx_seen[0];
      expect(Webhook.debug.responses["http://example.com/bob"].length).toBe(1);

      // shutdown
      await worker.destroy();
      expect(worker.activeHooks.size).toBe(0);

      // also mine a block while offline)
      await mine({ cashaddr: minerWallet.cashaddr!, blocks: 1 });

      // make two more transactions "offline"
      await aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
      ]);
      await aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 2000,
          unit: "satoshis",
        },
      ]);
      await mine({ cashaddr: minerWallet.cashaddr!, blocks: 1 });
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // wait worker to process the transactions occured while offline
      await worker.init();

      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(worker.activeHooks.size).toBe(1);
          expect(Webhook.debug.responses["http://example.com/bob"].length).toBe(
            3
          );

          resolve(true);
        }, 10000)
      );
    } catch (e: any) {
      console.log(e, e.stack, e.message);
      throw e;
    }
  });

  test("Test non-recurrent watch balance hook", async () => {
    try {
      const aliceWallet = await RegTestWallet.fromId(aliceWif);
      const bobWallet = await RegTestWallet.newRandom();
      await worker.registerWebhook({
        cashaddr: bobWallet.cashaddr!,
        url: "http://example.com/watchBalance",
        type: WebhookType.balance,
        recurrence: WebhookRecurrence.once,
      });

      await Promise.all([
        aliceWallet.send([
          {
            cashaddr: bobWallet.cashaddr!,
            value: 1000,
            unit: "satoshis",
          },
        ]),
        bobWallet.waitForTransaction(),
      ]);

      // return funds
      // let sendResponse2 = await bobWallet.sendMax(aliceWallet.cashaddr!);

      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(
            Webhook.debug.responses["http://example.com/watchBalance"].length
          ).toBe(1);
          expect(worker.activeHooks.size).toBe(0);

          resolve(true);
        }, 3000)
      );
    } catch (e: any) {
      console.log(e, e.stack, e.message);
      throw e;
    }
  });
});
