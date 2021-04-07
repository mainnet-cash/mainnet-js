import WebhookWorker from "./WebhookWorker";
import { default as axios } from "axios";
import { Network } from "../interface";

import { RegTestWallet } from "../wallet/Wif";
import { mine } from "../mine/mine";

let worker: WebhookWorker;
let alice = "";
let aliceWif = "";

/**
 * @jest-environment jsdom
 */

// mock axios requests
describe("Webhook worker tests", () => {
  beforeAll(async () => {
    try {
      if (process.env.PRIVATE_WIF) {
        alice = process.env.ADDRESS!;
        aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;
      } else {
        console.error("regtest env vars not set");
      }

      WebhookWorker.debug.setupAxiosMocks();
      worker = await WebhookWorker.instance();
    } catch (e) {
      throw e;
    }
  });

  beforeEach(async () => {
    worker.deleteAllWebhooks();
  });

  afterEach(async () => {
    WebhookWorker.debug.reset();;
  });

  afterAll(async () => {
    await worker.destroy();
    await worker.db.close();
  });

  test("Test posting hook", async () => {
    let result = await worker.postWebHook("http://example.com/pass", {});
    expect(result).toBe(true);

    let fail = await worker.postWebHook("http://example.com/fail", {});
    expect(fail).toBe(false);

    expect(WebhookWorker.debug.responses["http://example.com/fail"].length).toBe(1);
  });

  test("Test empty hook db", async () => {
    try {
      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(worker.activeHooks.size).toBe(0);
          expect(WebhookWorker.debug.responses).toStrictEqual({});
          resolve(true);
        }, 0)
      );
    } catch (e) {
      console.log(e, e.stack, e.message);
      throw e;
    }
  });

  test("Test starting with expired hook", async () => {
    await worker.registerWebhook(
      {
        cashaddr: alice,
        url: "http://example.com/pass",
        type: "transaction:in",
        recurrence: "once",
        duration_sec: -1000,
      },
      false
    );

    await worker.init();

    try {
      expect(worker.activeHooks.size).toBe(0);
      expect((await worker.db.getWebhooks()).length).toBe(0);
      expect(WebhookWorker.debug.responses).toStrictEqual({});
    } catch (e) {
      console.log(e, e.stack, e.message);
      throw e;
    }
  });

  test("Test non-recurrent hook to be deleted after successful call", async () => {
    try {
      const aliceWallet = await RegTestWallet.fromId(aliceWif);
      const bobWallet = await RegTestWallet.newRandom();
      await worker.registerWebhook({
        cashaddr: bobWallet.cashaddr!,
        url: "http://example.com/success",
        type: "transaction:in",
        recurrence: "once",
      });

      aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
      ]);
      await bobWallet.waitForTransaction();

      // return funds
      // let sendResponse2 = await bobWallet.sendMax(aliceWallet.cashaddr!);

      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(WebhookWorker.debug.responses["http://example.com/success"].length).toBe(1);
          expect(worker.activeHooks.size).toBe(0);

          resolve(true);
        }, 3000)
      );
    } catch (e) {
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
        type: "transaction:in",
        recurrence: "once",
      });

      aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
      ]);
      await bobWallet.waitForTransaction();

      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(WebhookWorker.debug.responses["http://example.com/fail"].length).toBe(1);
          expect(worker.activeHooks.size).toBe(1);

          // return funds
          // let sendResponse2 = await bobWallet.sendMax(aliceWallet.cashaddr!);
          resolve(true);
        }, 3000)
      );
    } catch (e) {
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
        type: "transaction:in",
        recurrence: "recurrent",
      });

      aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
      ]);
      await bobWallet.waitForTransaction();

      // return funds
      // let sendResponse2 = await bobWallet.sendMax(aliceWallet.cashaddr!);

      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(WebhookWorker.debug.responses["http://example.com/bob"].length).toBe(1);
          expect(worker.activeHooks.size).toBe(1);

          resolve(true);
        }, 3000)
      );
    } catch (e) {
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
        type: "transaction:out",
        recurrence: "recurrent",
      });

      aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
      ]);
      await bobWallet.waitForTransaction();

      // return funds
      bobWallet.sendMax(aliceWallet.cashaddr!);
      await aliceWallet.waitForTransaction();

      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(WebhookWorker.debug.responses["http://example.com/bob"].length).toBe(1);
          expect(worker.activeHooks.size).toBe(1);

          resolve(true);
        }, 3000)
      );
    } catch (e) {
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
        type: "transaction:in",
        recurrence: "recurrent",
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
      expect(WebhookWorker.debug.responses["http://example.com/bob"].length).toBe(1);

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
          expect(WebhookWorker.debug.responses["http://example.com/bob"].length).toBe(3);

          resolve(true);
        }, 10000)
      );
    } catch (e) {
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
        type: "balance",
        recurrence: "once",
      });

      aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
      ]);
      await bobWallet.waitForTransaction();

      // return funds
      // let sendResponse2 = await bobWallet.sendMax(aliceWallet.cashaddr!);

      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(WebhookWorker.debug.responses["http://example.com/watchBalance"].length).toBe(1);
          expect(worker.activeHooks.size).toBe(0);

          resolve(true);
        }, 3000)
      );
    } catch (e) {
      console.log(e, e.stack, e.message);
      throw e;
    }
  });
});
