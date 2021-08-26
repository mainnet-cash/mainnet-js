const assert = require("assert");
const playwright = require("playwright");
const PAGE_URL = "http://localhost:8080";

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
      waitUntil: "networkidle0",
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
    const result = await page.evaluate(async () => {
      const expects = [];

      const feeDelta = 0.0003; // bch

      const alice = await RegTestSmartBchWallet.fromPrivateKey(
        "0x758c7be51a76a9b6bc6b3e1a90e5ff4cc27aa054b77b7acb6f4f08a219c1ce45"
      );
      const balance = await alice.getBalance();

      const bob = await RegTestSmartBchWallet.newRandom();
      const sendResult = await alice.send(
        { address: bob.getDepositAddress(), value: 0.1, unit: "bch" },
        {},
        { gasPrice: 10 ** 10 }
      );
      expects.push([
        sendResult[0].balance.bch,
        "toBeGreaterThan",
        balance.bch - (0.1 + feeDelta),
      ]);
      expects.push([(await bob.getBalance()).bch, "toBe", 0.1]);

      const charlie = await RegTestSmartBchWallet.newRandom();
      const sendManyResult = await alice.send(
        [
          { address: bob.getDepositAddress(), value: 0.1, unit: "bch" },
          { address: charlie.getDepositAddress(), value: 0.1, unit: "bch" },
        ],
        {},
        { gasPrice: 10 ** 10 }
      );

      expects.push([
        sendManyResult[0].balance.bch,
        "toBeGreaterThan",
        balance.bch - 3 * (0.1 + feeDelta),
      ]);
      expects.push([
        sendManyResult[1].balance.bch,
        "toBeGreaterThan",
        balance.bch - 3 * (0.1 + feeDelta),
      ]);

      expects.push([(await bob.getBalance()).bch, "toBe", 0.2]);
      expects.push([(await charlie.getBalance()).bch, "toBe", 0.1]);

      return expects;
    });

    result.forEach((val) => {
      expect(val[0])[val[1]](val[2]);
    });
  });
});
