const playwright = require("playwright");
const PAGE_URL = "http://localhost:8080";

describe(`WalletDatabase should handle indexeddb `, () => {
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

  test(`Should store a testnet wallet`, async () => {
    const result = await page.evaluate(async () => {
      const db = new WalletDatabase("username123");
      let w1 = new TestNetWallet("TestNet Wallet 1");
      let w2 = new TestNetWallet("TestNet Wallet 2");
      await w1.generateWif();
      await w2.generateWif();
      await db.addWallet({ name: w1.name, wallet: w1.getSerializedWallet() });
      await db.addWallet({ name: w2.name, wallet: w2.getSerializedWallet() });
      let storedWallets = await db.getWallets();
      return storedWallets.pop();
    });
    expect(result.wallet.slice(0, 13)).toBe("wif:testnet:3");
    expect(result.name).toBe("TestNet Wallet 2");
  });
});
