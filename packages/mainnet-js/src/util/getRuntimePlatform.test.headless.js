const playwright = require("playwright");
const PAGE_URL = "http://localhost:8080";

describe(`Wallet should function in the browser`, () => {
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

  test(`Should load page`, async () => {
    expect(page).not.toBeNull();
    expect(await page.title()).toEqual("The Empty Mainnet App");
  });

  test(`Should recognize browser as platform`, async () => {
    const result = await page.evaluate(async () => {
      return Mainnet.getRuntimePlatform();
    });
    expect(result).toBe("browser");
  });
});
