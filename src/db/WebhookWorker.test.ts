import WebhookWorker from "./WebhookWorker";
import { default as axios } from "axios";
import { Network } from "../interface";
import { initProviders, disconnectProviders } from "../network/Connection";

import { RegTestWallet } from "../wallet/Wif";
import { mine } from "../mine";

let worker: WebhookWorker;
let responses: any = {};
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

      axios.interceptors.request.use((config) => {
        if (config.url!.indexOf("example.com")) {
          config.url = "x" + config.url!;
        }
        return config;
      });

      axios.interceptors.response.use(
        (response) => {
          return response;
        },
        (error) => {
          let url = error.config.url!.slice(1);

          if (url in responses) {
            responses[url].push(error);
          } else {
            responses[url] = [error];
          }

          if (url === "http://example.com/fail")
            return Promise.reject({ status: 503 });

          return Promise.resolve({ status: 200 });
        }
      );
      await initProviders([Network.REGTEST]);
      worker = new WebhookWorker(Network.REGTEST);
      await worker.init();
    } catch (e) {
      throw e;
    }
  });

  beforeEach(async () => {
    worker.deleteAllWebhooks();
  });

  afterEach(async () => {
    responses = {};
  });

  afterAll(async () => {
    await worker.destroy();
    await worker.db.close();
    await disconnectProviders([Network.REGTEST]);
  });

  test("Test posting hook", async () => {
    let result = await worker.postWebHook("http://example.com/pass", {});
    expect(result).toBe(true);

    let fail = await worker.postWebHook("http://example.com/fail", {});
    expect(fail).toBe(false);

    expect(responses["http://example.com/fail"].length).toBe(1);
  });

  test("Test empty hook db", async () => {
    try {
      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(worker.activeHooks.size).toBe(0);
          expect(responses).toStrictEqual({});
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
      expect(responses).toStrictEqual({});
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
          expect(responses["http://example.com/success"].length).toBe(1);
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
          expect(responses["http://example.com/fail"].length).toBe(1);
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
          expect(responses["http://example.com/bob"].length).toBe(1);
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
          expect(responses["http://example.com/bob"].length).toBe(1);
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
      const tx = hook!.tx_seen[0];
      expect(responses["http://example.com/bob"].length).toBe(1);

      // shutdown
      await worker.destroy();
      expect(worker.activeHooks.size).toBe(0);

      // also mine a block while offline)
      await mine({ cashaddr: minerWallet.cashaddr!, blocks: 1 });
      await worker.provider.waitForBlock();

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
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await mine({ cashaddr: minerWallet.cashaddr!, blocks: 1 });
      await worker.provider.waitForBlock();

      // wait worker to process the transactions occured while offline
      await worker.provider.disconnect();
      await worker.provider.connect();
      await worker.init();

      await new Promise((resolve) =>
        setTimeout(async () => {
          expect(worker.activeHooks.size).toBe(1);
          expect(responses["http://example.com/bob"].length).toBe(3);

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
          expect(responses["http://example.com/watchBalance"].length).toBe(1);
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
