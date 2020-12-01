import WebhookWorker from "./WebhookWorker";
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
beforeAll(async () => {
  if (process.env.ALICE_TESTNET_ADDRESS) {
    alice = process.env.ALICE_TESTNET_ADDRESS as string;
    aliceWif = process.env.ALICE_TESTNET_WALLET_ID as string
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

    // if (url === "http://example.com/pass")
    //   return Promise.resolve({status: 200});

    // if (url === "http://example.com/alice")
    //   return Promise.resolve({status: 200});

    // if (url === "http://example.com/bob")
    //   return Promise.resolve({status: 200});

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
  let result = await worker.postWebHook("http://example.com/pass", "in", {});
  expect(result).toBe(true);

  let fail = await worker.postWebHook("http://example.com/fail", "in", {});
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
  await db.addWebHook(alice, "transaction:in", "http://example.com/pass", "once", -1000);

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
    const hookId = await db.addWebHook(bobWallet.cashaddr!, "transaction:in", "http://example.com/success", "once");

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
    const hookId = await db.addWebHook(bobWallet.cashaddr!, "transaction:in", "http://example.com/fail", "once");

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
    const hookId = await db.addWebHook(bobWallet.cashaddr!, "transaction:in", "http://example.com/bob", "recurrent");

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
    const hookId = await db.addWebHook(bobWallet.cashaddr!, "transaction:out", "http://example.com/bob", "recurrent");

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