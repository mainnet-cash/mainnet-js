import { disconnectProviders, initProviders } from "mainnet-js";
import WebhookWorker from "../webhook/WebhookWorker.js";
import { Webhook } from "./Webhook.js";
import {
  responses,
  resetWebhookMock,
  setupWebhookMock,
  teardownWebhookMock,
} from "./WebhookMock.js";

let worker: WebhookWorker;
let alice = "";
let aliceWif = "";

describe("Webhook worker tests", () => {
  beforeAll(async () => {
    try {
      await initProviders();
      if (process.env.PRIVATE_WIF) {
        alice = process.env.ADDRESS!;
        aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;
      } else {
        console.error("regtest env vars not set");
      }

      setupWebhookMock();
      worker = await WebhookWorker.instance();
    } catch (e: any) {
      throw e;
    }
  });

  beforeEach(async () => {
    worker.deleteAllWebhooks();
  });

  afterEach(async () => {
    resetWebhookMock();
  });

  afterAll(async () => {
    teardownWebhookMock();
    await worker.destroy();
    await worker.db.close();
    await disconnectProviders();
  });

  test("Test posting hook", async () => {
    const hook1 = new Webhook({ url: "http://example.com/pass" });
    let success = await hook1.post({});
    expect(success).toBe(true);

    const hook2 = new Webhook({ url: "http://example.com/fail" });
    let fail = await hook2.post({});
    expect(fail).toBe(false);

    expect(responses["http://example.com/pass"].length).toBe(1);
    expect(responses["http://example.com/fail"].length).toBe(1);
  });

  test("Test empty hook db", async () => {
    try {
      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(worker.activeHooks.size).toBe(0);
          expect(responses).toStrictEqual({});
          resolve(true);
        }, 0),
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
      false,
    );

    await worker.init();

    try {
      expect(worker.activeHooks.size).toBe(0);
      expect((await worker.db.getWebhooks()).length).toBe(0);
      expect(responses).toStrictEqual({});
    } catch (e: any) {
      console.log(e, e.stack, e.message);
      throw e;
    }
  });
});
