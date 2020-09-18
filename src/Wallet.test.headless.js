const playwright = require("playwright");
const PAGE_URL = "http://localhost:8080";

describe(`Playwright should load test page`, () => {
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

  test(`Should return deposit address from testnet wallet`, async () => {
    const result = await page.evaluate(async (wif) => {
      // Get alices deposit address
      const alice = new mainnet.TestnetWallet("Alice's Mining");
      await alice.fromWIF(wif);
      return alice.depositAddress();
    }, process.env.PRIVATE_WIF);
    expect(result.startsWith("bchtest:qp")).toBeTruthy();
  });

  test(`Should return deposit qr from testnet wallet`, async () => {
    const result = await page.evaluate(async (wif) => {
      // Get a QR code for alice's wallet
      const alice = new mainnet.TestnetWallet("Alice's Mining");
      await alice.fromWIF(wif);
      return alice.depositQr();
    }, process.env.PRIVATE_WIF);
    expect(
      result.startsWith("data:image/svg+xml;base64,PD94bWwgdm")
    ).toBeTruthy();
  });

  test(`Should return deposit address from testnet wallet`, async () => {
    const result = await page.evaluate(async (wif) => {
      // Get alices deposit address
      const alice = new mainnet.TestnetWallet("Alice's Mining");
      await alice.fromWIF(wif);
      return alice.depositAddress();
    }, process.env.PRIVATE_WIF);
    expect(result.startsWith("bchtest:qp")).toBeTruthy();
  });

  test(`Should return deposit qr from testnet wallet`, async () => {
    const result = await page.evaluate(async (wif) => {
      // Get a QR code for alice's wallet
      const alice = new mainnet.TestnetWallet("Alice's Mining");
      await alice.fromWIF(wif);
      return alice.depositQr();
    }, process.env.PRIVATE_WIF);
    expect(
      result.startsWith("data:image/svg+xml;base64,PD94bWwgdm")
    ).toBeTruthy();
  });

  test(`Should load page`, async () => {
    expect(page).not.toBeNull();
    expect(await page.title()).toEqual("Load module for playwright");
  });
});
