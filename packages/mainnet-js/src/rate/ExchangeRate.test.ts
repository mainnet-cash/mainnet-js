import { BalanceResponse } from "../util/balanceObjectFromSatoshi";
import { RegTestWallet } from "../wallet/Wif";
import { ExchangeRate } from "./ExchangeRate";
import { delay } from "../util/delay";
import { initProviders, disconnectProviders } from "../network";

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe("Exchange rate tests", () => {
  test("Get price in usd", async () => {
    ExchangeRate.setupAxiosMock(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=usd",
      { "bitcoin-cash": { usd: 666.666 } }
    );
    ExchangeRate.setupAxiosMock(
      "https://markets.api.bitcoin.com/live/bitcoin",
      {
        BCH: 666.666,
      }
    );

    let rate = await ExchangeRate.get("usd");
    expect(rate).toBe(666.666);
  });

  test("Test watchBalanceUsd", async () => {
    ExchangeRate.setupAxiosMock(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=usd",
      { "bitcoin-cash": { usd: 666.666 } }
    );

    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const balance = (await alice.getBalance()) as BalanceResponse;
    let cbCounter = 0;
    const cancelWatchFn = alice.watchBalanceUsd(async (newBalance) => {
      cbCounter++;
      if (cbCounter === 1) {
        expect(newBalance.usd!).toBeGreaterThan(balance.usd!);
      }
    }, 3000);

    ExchangeRate.setupAxiosMock(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=usd",
      { "bitcoin-cash": { usd: 777.777 } }
    );

    await delay(3000);

    await alice.send({
      cashaddr: bob.getDepositAddress(),
      value: 10000,
      unit: "sat",
    });

    await delay(3000);

    ExchangeRate.removeAxiosMock(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=usd"
    );
    expect(cbCounter).toBe(2);
    await cancelWatchFn();
  });
});
