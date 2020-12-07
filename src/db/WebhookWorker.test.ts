import WebhookWorker, { webhook } from "./WebhookWorker";
import { default as SqlProvider } from "../db/SqlProvider";
import { default as axios } from 'axios';

import { Wallet, TestNetWallet } from "../wallet/Wif";

let db: SqlProvider;
let worker: WebhookWorker;
let responses: any = {};
let alice = "";
let aliceWif = "";
let bob = "";
let bobWif = "";

/**
 * @jest-environment jsdom
 */

// mock axios requests
describe("Webhook worker tests", () => {

  beforeAll(async () => {
    if (process.env.ALICE_TESTNET_ADDRESS) {
      alice = process.env.ALICE_TESTNET_ADDRESS as string;
      aliceWif = process.env.ALICE_TESTNET_WALLET_ID as string;
      bob = process.env.BOB_TESTNET_ADDRESS as string;
      bobWif = process.env.BOB_TESTNET_WALLET_ID as string;
    } else {
      console.error(
        "ALICE_TESTNET_ADDRESS and BOB_TESTNET_ADDRESS env vars not set"
      );
    }

    axios.interceptors.request.use((config) => {
      if (config.url!.indexOf("example.com")) {
        config.url = 'x' + config.url!;
      }
      return config;
    });

    axios.interceptors.response.use((response) => {
      return response;
    }, (error) => {
      let url = error.config.url!.slice(1);

      if (url in responses) {
        responses[url].push(error);
      } else {
        responses[url] = [error];
      }

      if (url === "http://example.com/fail")
        return Promise.reject({status: 503});

      return Promise.resolve({status: 200});
    });
  });

  beforeEach(async () => {
    db = new SqlProvider("testnet");
    await db.init();
    await db.db.query("delete from webhook;");

    worker = new WebhookWorker("testnet");
  });

  afterEach(async () => {
    await db.close();
    responses = {};
  });

  test("Test posting hook", async () => {
    let result = await worker.postWebHook("http://example.com/pass", {});
    expect(result).toBe(true);

    let fail = await worker.postWebHook("http://example.com/fail", {});
    expect(fail).toBe(false);

    expect(responses["http://example.com/fail"].length).toBe(1);
  });


  test("Test empty hook db", async () =>{
    try {
      await worker.init();
      await worker.start();
      await new Promise( resolve => setTimeout(async () => {
        expect(responses).toStrictEqual({});
        await worker.destroy();
        resolve(true);
      }, 2000));
    } catch (e) {
      console.log(e, e.stack, e.message);
    }
  });

  test("Test starting with expired hook", async () => {
    await db.addWebHook(alice, "http://example.com/pass", "transaction:in", "once", -1000);

    try {
      await worker.init();
      await worker.start();
      expect(worker.activeHooks.size).toBe(0);
      expect(responses).toStrictEqual({});
    } catch (e) {
      console.log(e, e.stack, e.message);
    }
  });

  test("Test non-recurrent hook to be deleted after successful call", async () => {
    try {
      const aliceWallet = await TestNetWallet.fromId(aliceWif);
      const bobWallet = await TestNetWallet.newRandom();
      const hookId = (await db.addWebHook(bobWallet.cashaddr!, "http://example.com/success", "transaction:in", "once")).id!;

      await worker.init();
      await worker.start();

      let sendResponse1 = await aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
      ]);

      // return funds
      let sendResponse2 = await bobWallet.sendMax(aliceWallet.cashaddr!);

      await new Promise(resolve => setTimeout(async () => {
        await db.deleteWebHook(hookId);
        expect(responses["http://example.com/success"].length).toBe(1);
        expect(worker.activeHooks.size).toBe(0);
        await worker.destroy();
        resolve(true);
      }, 10000));
    } catch (e) {
      console.log(e, e.stack, e.message);
    }
  });

  test("Test non-recurrent hook to be not deleted after failed call", async () => {
    try {
      const aliceWallet = await TestNetWallet.fromId(aliceWif);
      const bobWallet = await TestNetWallet.newRandom();
      const hookId = (await db.addWebHook(bobWallet.cashaddr!, "http://example.com/fail", "transaction:in", "once")).id!;

      await worker.init();
      await worker.start();

      let sendResponse1 = await aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
      ]);

      await new Promise(resolve => setTimeout(async () => {
        await db.deleteWebHook(hookId);
        expect(responses["http://example.com/fail"].length).toBe(1);
        expect(worker.activeHooks.size).toBe(1);
        await worker.destroy();

        // return funds
        let sendResponse2 = await bobWallet.sendMax(aliceWallet.cashaddr!);

        resolve(true);
      }, 5000));
    } catch (e) {
      console.log(e, e.stack, e.message);
    }
  });

  test("Test recurrent hook for incoming transaction", async () =>{
    try {
      const aliceWallet = await TestNetWallet.fromId(aliceWif);
      const bobWallet = await TestNetWallet.newRandom();
      const hookId = (await db.addWebHook(bobWallet.cashaddr!, "http://example.com/bob", "transaction:in", "recurrent")).id!;

      await worker.init();
      await worker.start();

      let sendResponse1 = await aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
      ]);

      // return funds
      let sendResponse2 = await bobWallet.sendMax(aliceWallet.cashaddr!);

      await new Promise( resolve => setTimeout(async () => {
        await db.deleteWebHook(hookId);
        expect(responses["http://example.com/bob"].length).toBe(1);
        expect(worker.activeHooks.size).toBe(1);
        await worker.destroy();
        resolve(true);
      }, 10000));
    } catch (e) {
      console.log(e, e.stack, e.message);
    }
  });

  test("Test recurrent hook for outgoing transactions", async () => {
    try {
      const aliceWallet = await TestNetWallet.fromId(aliceWif);
      const bobWallet = await TestNetWallet.newRandom();
      const hookId = (await db.addWebHook(bobWallet.cashaddr!, "http://example.com/bob", "transaction:out", "recurrent")).id!;

      await worker.init();
      await worker.start();

      let sendResponse1 = await aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
      ]);

      // return funds
      let sendResponse2 = await bobWallet.sendMax(aliceWallet.cashaddr!);

      await new Promise(resolve => setTimeout(async () => {
        await db.deleteWebHook(hookId);
        expect(responses["http://example.com/bob"].length).toBe(1);
        expect(worker.activeHooks.size).toBe(1);
        await worker.destroy();
        resolve(true);
      }, 10000));
    } catch (e) {
      console.log(e, e.stack, e.message);
    }
  });

  test("Test should pickup transactions happened while offline", async () => {
    try {
      const aliceWallet = await TestNetWallet.fromId(aliceWif);
      const bobWallet = await TestNetWallet.newRandom();
      const hookId = (await db.addWebHook(bobWallet.cashaddr!, "http://example.com/bob", "transaction:in", "recurrent")).id!;

      await worker.init();
      await worker.start();

      // initial transaction
      await aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
      ]);

      // wait worker to process
      await new Promise(resolve => setTimeout(resolve, 5000));

      // shutdown
      await worker.destroy();

      let hook = await db.getWebHook(hookId);
      console.log(hook);
      expect(hook!.status).not.toBe("");
      expect(hook!.last_tx).not.toBe("");

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
          value: 1000,
          unit: "satoshis",
        },
      ]);

      // wait worker to process the transactions occured while offline
      worker = new WebhookWorker("testnet");
      await worker.init();
      await worker.start();
      await new Promise(resolve => setTimeout(resolve, 5000));

      // return funds
      await bobWallet.sendMax(aliceWallet.cashaddr!);

      await new Promise(resolve => setTimeout(async () => {
        await db.deleteWebHook(hookId);
        expect(responses["http://example.com/bob"].length).toBe(3);
        expect(worker.activeHooks.size).toBe(1);
        await worker.destroy();
        resolve(true);
      }, 1000));
    } catch (e) {
      console.log(e, e.stack, e.message);
    }
  });

  test("Test non-recurrent watch balance hook", async () => {
    try {
      const aliceWallet = await TestNetWallet.fromId(aliceWif);
      const bobWallet = await TestNetWallet.newRandom();
      const hookId = (await db.addWebHook(bobWallet.cashaddr!, "http://example.com/watchBalance", "watchBalance")).id!;

      await worker.init();
      await worker.start();

      let sendResponse1 = await aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 1000,
          unit: "satoshis",
        },
      ]);
      // return funds
      let sendResponse2 = await bobWallet.sendMax(aliceWallet.cashaddr!);

      await new Promise(resolve => setTimeout(async () => {
        await db.deleteWebHook(hookId);
        expect(responses["http://example.com/watchBalance"].length).toBe(1);
        expect(worker.activeHooks.size).toBe(0);
        await worker.destroy();
        resolve(true);
      }, 5000));
    } catch (e) {
      console.log(e, e.stack, e.message);
    }
  });

});