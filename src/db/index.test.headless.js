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

  test(`Should store and recall a testnet wallet`, async () => {
    const result = await page.evaluate(async () => {
      let w1 = await TestNetWallet.newRandom("Testnet Wallet 1");
      let w1Again = await TestNetWallet.named("Testnet Wallet 1");
      return [w1, w1Again];
    });
    let w1 = result[0];
    let w2 = result[1];
    expect(w1.name).toBe("Testnet Wallet 1");
    expect(w1.cashaddr.slice(0, 9)).toBe("bchtest:q");
    expect(w1.privateKeyWif.startsWith("c")).toBeTruthy();
    expect(w1.network).toBe("testnet");
    expect(w1.name).toBe(w2.name);
    expect(w1.privateKeyWif).toBe(w2.privateKeyWif);
  });

  test(`Should store and recall a mainnet wallet`, async () => {
    const result = await page.evaluate(async () => {
      let w1 = await Wallet.named("Mainnet Wallet 1");
      let w1Again = await Wallet.named("Mainnet Wallet 1");
      return [w1, w1Again];
    });
    let w1 = result[0];
    let w2 = result[1];
    expect(w1.name.startsWith("Mainnet Wallet 1")).toBeTruthy();
    expect(w1.cashaddr.startsWith("bitcoincash:q")).toBeTruthy();
    expect(w1.network).toBe("mainnet");
    expect(
      w1.privateKeyWif[0] == "K" || w1.privateKeyWif[0] == "L"
    ).toBeTruthy();

    expect(w1.name).toBe(w2.name);
    expect(w1.privateKeyWif).toBe(w2.privateKeyWif);
  });
});
