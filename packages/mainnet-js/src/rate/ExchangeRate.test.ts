import { setupFetchMock } from "../test/fetch";
import { ExchangeRate } from "./ExchangeRate";
import { initProviders, disconnectProviders } from "../network";
import { Config } from "../config";

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe("Exchange rate tests", () => {
  test("Get price in usd", async () => {
    setupFetchMock("https://markets.api.bitcoin.com/live/bitcoin", {
      data: {
        BCH: 1337.42,
      },
    });

    let rate = await ExchangeRate.get("usd");
    expect(rate).toBe(1337.42);
  });

  test("Test other currencies", async () => {
    const eurRate = await ExchangeRate.get("eur");
    expect(eurRate).toBeGreaterThan(0);
  });

  test("Test non-existing currency", async () => {
    await expect(ExchangeRate.get("xyz")).rejects.toThrow();
  });

  test("Test custom exchange rate function", async () => {
    Config.GetExchangeRateFn = async (symbol: string): Promise<number> => {
      if (symbol === "usd") {
        return 5555.55;
      }
      throw new Error("Unsupported currency");
    };

    const usdRate = await ExchangeRate.get("usd", false);
    expect(usdRate).toBe(5555.55);

    await expect(ExchangeRate.get("eur", false)).rejects.toThrow(
      "Unsupported currency"
    );

    Config.GetExchangeRateFn = undefined;
  });
});
