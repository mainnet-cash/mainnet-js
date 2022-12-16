import WebhookWorker from "./WebhookWorker";
import { RegTestWallet } from "../wallet/Wif";
import { mine } from "../mine/mine";
import { Webhook, WebhookRecurrence, WebhookType } from "./Webhook";
import { GsppProvider, SlpDbProvider, SlpGenesisOptions } from "../slp";

let worker: WebhookWorker;
let alice;
let aliceWif;
let tokenId;

const serversSlpDb = { ...{}, ...SlpDbProvider.defaultServers };
const serversGspp = { ...{}, ...GsppProvider.defaultServers };

/**
 * @jest-environment jsdom
 */
describe.skip("Webhook worker tests", () => {
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

      const genesisOptions: SlpGenesisOptions = {
        name: "Webhook Token",
        ticker: "WHT",
        decimals: 2,
        initialAmount: 10000,
        documentUrl: "https://mainnet.cash",
        documentHash:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      };

      const aliceWallet = await RegTestWallet.slp.fromId(aliceWif);
      const genesisResult = await aliceWallet.slp.genesis(genesisOptions);
      tokenId = genesisResult.tokenId;

      SlpDbProvider.defaultServers.testnet =
        SlpDbProvider.defaultServers.regtest;
      GsppProvider.defaultServers.testnet = GsppProvider.defaultServers.regtest;
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

    SlpDbProvider.defaultServers = serversSlpDb;
    GsppProvider.defaultServers = serversGspp;
  });

  test("Test non-recurrent hook to be deleted after successful call", async () => {
    try {
      const aliceWallet = await RegTestWallet.slp.fromId(aliceWif);
      const bobWallet = await RegTestWallet.slp.newRandom();
      await worker.registerWebhook({
        cashaddr: bobWallet.slp.slpaddr,
        url: "http://example.com/success",
        type: WebhookType.slpTransactionIn,
        recurrence: WebhookRecurrence.once,
        tokenId: tokenId,
      });

      await Promise.all([
        aliceWallet.slp.send([
          {
            slpaddr: bobWallet.slp.slpaddr,
            value: 1000,
            tokenId: tokenId,
          },
        ]),
        bobWallet.slp.waitForTransaction(),
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
      const aliceWallet = await RegTestWallet.slp.fromId(aliceWif);
      const bobWallet = await RegTestWallet.slp.newRandom();
      await worker.registerWebhook({
        cashaddr: bobWallet.slp.slpaddr,
        url: "http://example.com/fail",
        type: WebhookType.slpTransactionIn,
        recurrence: WebhookRecurrence.once,
        tokenId: tokenId,
      });

      await Promise.all([
        aliceWallet.slp.send([
          {
            slpaddr: bobWallet.slp.slpaddr,
            value: 1000,
            tokenId: tokenId,
          },
        ]),
        bobWallet.slp.waitForTransaction(),
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
      const aliceWallet = await RegTestWallet.slp.fromId(aliceWif);
      const bobWallet = await RegTestWallet.slp.newRandom();
      await worker.registerWebhook({
        cashaddr: bobWallet.slp.slpaddr,
        url: "http://example.com/bob",
        type: WebhookType.slpTransactionIn,
        recurrence: WebhookRecurrence.recurrent,
        tokenId: tokenId,
      });

      await Promise.all([
        aliceWallet.slp.send([
          {
            slpaddr: bobWallet.slp.slpaddr,
            value: 1000,
            tokenId: tokenId,
          },
        ]),
        bobWallet.slp.waitForTransaction(),
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
      const aliceWallet = await RegTestWallet.slp.fromId(aliceWif);
      const bobWallet = await RegTestWallet.slp.newRandom();
      await worker.registerWebhook({
        cashaddr: bobWallet.slp.slpaddr,
        url: "http://example.com/bob",
        type: WebhookType.slpTransactionOut,
        recurrence: WebhookRecurrence.recurrent,
        tokenId: tokenId,
      });

      await aliceWallet.send([
        {
          cashaddr: bobWallet.cashaddr!,
          value: 1000,
          unit: "satoshi",
        },
      ]);

      await Promise.all([
        aliceWallet.slp.send([
          {
            slpaddr: bobWallet.slp.slpaddr,
            value: 1000,
            tokenId: tokenId,
          },
        ]),
        bobWallet.slp.waitForTransaction(),
      ]);

      // return funds
      await Promise.all([
        bobWallet.slp.sendMax(aliceWallet.cashaddr!, tokenId),
        aliceWallet.slp.waitForTransaction(),
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

  test("Test non-recurrent watch balance hook", async () => {
    try {
      const aliceWallet = await RegTestWallet.slp.fromId(aliceWif);
      const bobWallet = await RegTestWallet.slp.newRandom();
      await worker.registerWebhook({
        cashaddr: bobWallet.slp.slpaddr,
        url: "http://example.com/watchBalance",
        type: WebhookType.slpBalance,
        recurrence: WebhookRecurrence.once,
        tokenId: tokenId,
      });

      await Promise.all([
        aliceWallet.slp.send([
          {
            slpaddr: bobWallet.slp.slpaddr,
            value: 1000,
            tokenId: tokenId,
          },
        ]),
        bobWallet.slp.waitForTransaction(),
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
