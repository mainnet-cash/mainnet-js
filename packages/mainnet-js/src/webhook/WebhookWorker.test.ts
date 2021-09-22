import WebhookWorker from "../webhook/WebhookWorker";
import { RegTestWallet } from "../wallet/Wif";
import { mine } from "../mine/mine";
import { Webhook } from "./Webhook";

let worker: WebhookWorker;
let alice = "";
let aliceWif = "";

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

  test("Test posting hook", async () => {
    const hook1 = new Webhook({ url: "http://example.com/pass" });
    let success = await hook1.post({});
    expect(success).toBe(true);

    const hook2 = new Webhook({ url: "http://example.com/fail" });
    let fail = await hook2.post({});
    expect(fail).toBe(false);

    expect(Webhook.debug.responses["http://example.com/pass"].length).toBe(1);

    expect(Webhook.debug.responses["http://example.com/fail"].length).toBe(1);
  });

  test("Test empty hook db", async () => {
    try {
      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(worker.activeHooks.size).toBe(0);
          expect(Webhook.debug.responses).toStrictEqual({});
          resolve(true);
        }, 0)
      );
    } catch (e: any) {
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
      expect(Webhook.debug.responses).toStrictEqual({});
    } catch (e: any) {
      console.log(e, e.stack, e.message);
      throw e;
    }
  });
});
