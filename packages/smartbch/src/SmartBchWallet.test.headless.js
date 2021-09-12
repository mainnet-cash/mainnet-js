const assert = require("assert");
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
});
