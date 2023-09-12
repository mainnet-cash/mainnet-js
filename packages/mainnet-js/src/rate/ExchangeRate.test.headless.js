const playwright = require("playwright");
const PAGE_URL = "http://localhost:8080";

describe("Exchange rate tests", () => {
  let browser;
  let page;

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

  test("Get price in usd", async () => {
    await page.evaluate(async () => {
      let rate = await ExchangeRate.get("usd");
      expect(rate).toBeGreaterThan(0);
    }, []);
  });
});
