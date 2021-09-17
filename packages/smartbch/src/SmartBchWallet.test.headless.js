const playwright = require("playwright");
const PAGE_URL = "http://localhost:8080/smartbch/index.html";

describe(`SmartBchWallet should function in the browser`, () => {
  let browser = null;
  let page = null;

  /**
   * Create the browser and page context
   */
  beforeAll(async () => {
    browser = await playwright["chromium"].launch();
    page = await browser.newPage();

    if (!page) {
      throw new Error("Connection wasn't established");
    }

    // Open the page
    await page.goto(PAGE_URL, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  test(`Test SmartBch signing`, async () => {
    const signResult = await page.evaluate(async () => {
      const wallet = await SmartBchWallet.newRandom();
      const sig = await wallet.sign("test");
      return await wallet.verify("test", sig.signature);
    });
    expect(signResult.valid).toBe(true);
  });

  test("Test SmartBch sending", async () => {
    await page.evaluate(async (SBCH_ALICE_ID) => {
      const feeDelta = 0.0003; // bch

      const alice = await RegTestSmartBchWallet.fromId(SBCH_ALICE_ID);
      const balance = await alice.getBalance();

      const bob = await RegTestSmartBchWallet.newRandom();
      const sendResult = await alice.send(
        { address: bob.getDepositAddress(), value: 0.1, unit: "bch" },
        {},
        { gasPrice: 10 ** 10 }
      );
      expect(sendResult[0].balance.bch).toBeGreaterThan(
        balance.bch - (0.1 + feeDelta)
      );
      expect((await bob.getBalance()).bch).toBe(0.1);

      const charlie = await RegTestSmartBchWallet.newRandom();
      const sendManyResult = await alice.send(
        [
          { address: bob.getDepositAddress(), value: 0.1, unit: "bch" },
          { address: charlie.getDepositAddress(), value: 0.1, unit: "bch" },
        ],
        {},
        { gasPrice: 10 ** 10 }
      );

      expect(sendManyResult[0].balance.bch).toBeGreaterThan(
        balance.bch - 3 * (0.1 + feeDelta)
      );
      expect(sendManyResult[1].balance.bch).toBeGreaterThan(
        balance.bch - 3 * (0.1 + feeDelta)
      );

      expect((await bob.getBalance()).bch).toBe(0.2);
      expect((await charlie.getBalance()).bch).toBe(0.1);
    }, process.env.SBCH_ALICE_ID);
  });

  test("Test waiting and watching", async () => {
    await page.evaluate(async (SBCH_ALICE_ID) => {
      // let all transactions in previous blocks be settled
      await delay(7000);

      const alice = await RegTestSmartBchWallet.fromId(SBCH_ALICE_ID);

      const bob = await RegTestSmartBchWallet.newRandom();

      let waitTxResult = false;
      setTimeout(async () => {
        const result = await alice.waitForTransaction({
          getBalance: true,
          getTransactionInfo: true,
        });
        expect(result.balance.sat).toBeGreaterThan(0);
        expect(result.transactionInfo.transactionHash.length).toBe(66);
        waitTxResult = true;
      }, 0);

      let waitBalanceResult = false;
      setTimeout(async () => {
        const result = await alice.waitForBalance(0.001, "bch");
        expect(result.sat).toBeGreaterThan(0);
        waitBalanceResult = true;
      }, 0);

      let aliceWatchResult = false;
      const aliceWatchCancel = alice.watchAddressTransactions((tx) => {
        expect(tx.from).toBe(alice.getDepositAddress());
        expect(tx.to).toBe(bob.getDepositAddress());
        aliceWatchCancel();
        aliceWatchResult = true;
      });

      let bobWatchResult = false;
      const bobWatchCancel = bob.watchAddressTransactions((tx) => {
        expect(tx.from).toBe(alice.getDepositAddress());
        expect(tx.to).toBe(bob.getDepositAddress());
        bobWatchCancel();
        bobWatchResult = true;
      });

      let bobBalanceWatchResult = false;
      const bobBalanceWatchCancel = bob.watchBalance((balance) => {
        expect(balance.bch).toBe(0.001);
        bobBalanceWatchCancel();
        bobBalanceWatchResult = true;
      });

      let blockWatchResult = false;
      const blockWatchCancel = bob.watchBlocks((block) => {
        expect(block.hash.length).toBe(66);
        blockWatchCancel();
        blockWatchResult = true;
      });

      let blockWaitResult = false;
      setTimeout(async () => {
        const blockNumber = await alice.provider.getBlockNumber();
        const result = await alice.waitForBlock();
        expect(result.hash.length).toBe(66);
        expect(result.number).toBe(blockNumber + 1);
        blockWaitResult = true;
      }, 0);

      let blockNumberWaitResult = false;
      setTimeout(async () => {
        const blockNumber = await alice.provider.getBlockNumber();
        const result = await alice.waitForBlock(blockNumber + 2);
        expect(result.hash.length).toBe(66);
        expect(result.number).toBe(blockNumber + 2);
        blockNumberWaitResult = true;
      }, 0);

      alice.send(
        { address: bob.getDepositAddress(), value: 0.001, unit: "bch" },
        {},
        { gasPrice: 10 ** 10 }
      );

      // lets wait for 2 more blocks to be mined
      await delay(15000);
      expect(waitTxResult).toBe(true);
      expect(waitBalanceResult).toBe(true);
      expect(aliceWatchResult).toBe(true);
      expect(bobWatchResult).toBe(true);
      expect(bobBalanceWatchResult).toBe(true);
      expect(blockWatchResult).toBe(true);
      expect(blockWaitResult).toBe(true);
      expect(blockNumberWaitResult).toBe(true);
    }, process.env.SBCH_ALICE_ID);
  });
});
