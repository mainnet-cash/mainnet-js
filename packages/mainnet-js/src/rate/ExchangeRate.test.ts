import { removeFetchMock, setupFetchMock } from "../test/fetch";
import { BalanceResponse } from "../util/balanceObjectFromSatoshi";
import { RegTestWallet } from "../wallet/Wif";
import { ExchangeRate, getRateFromExchange } from "./ExchangeRate";
import { delay } from "../util/delay";
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

  test("Test watchBalanceUsd", async () => {
    setupFetchMock("https://markets.api.bitcoin.com/live/bitcoin", {
      data: {
        BCH: 1337.42,
      },
    });

    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const balance = (await alice.getBalance()) as BalanceResponse;
    let cbCounter = 0;
    const cancelWatchFn = await alice.watchBalanceUsd(async (newBalance) => {
      cbCounter++;
      if (cbCounter === 1) {
        expect(newBalance.usd!).toBeGreaterThan(balance.usd!);
      }
    }, 3000);

    setupFetchMock("https://markets.api.bitcoin.com/live/bitcoin", {
      data: {
        BCH: 31337.42,
      },
    });

    await delay(3000);

    await alice.send({
      cashaddr: bob.getDepositAddress(),
      value: 10000,
      unit: "sat",
    });

    await delay(3000);

    removeFetchMock("https://markets.api.bitcoin.com/live/bitcoin");
    expect(cbCounter).toBe(2);
    await cancelWatchFn();
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
