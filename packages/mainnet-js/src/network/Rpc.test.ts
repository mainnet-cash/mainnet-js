import { disconnectProviders, initProviders } from "./Connection";
import { RegTestWallet } from "../wallet/Wif";
import { getNetworkProvider } from "../network/default";
import { Network } from "cashscript";
import { mine } from "../mine";

const aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;

beforeAll(async () => {
  await initProviders();
});

afterAll(async () => {
  await disconnectProviders();
});

describe("Rpc tests", () => {
  test("get utxos", async () => {
    const provider = getNetworkProvider(Network.REGTEST);
    expect(
      await provider.getUtxos(
        "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0"
      )
    ).not.toHaveLength(0);
  });

  test("subcribe to address", async () => {
    const provider = getNetworkProvider(Network.REGTEST);
    try {
      await provider.subscribeToAddress(
        "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0",
        async (data) => {
          expect(data).not.toBe("");
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (e: any) {
      console.log(e, e.message, e.stack);
    }
  });

  test("subcribe to muliple addresses bug", async () => {
    const provider = getNetworkProvider(Network.REGTEST);

    try {
      await provider.subscribeToAddress(
        "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0",
        async (data) => {
          // console.log("First", data);
          expect(data).not.toBe("");
          data;
        }
      );

      await provider.subscribeToAddress(
        "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0",
        async (data) => {
          // console.log("Second", data);
          expect(data).not.toBe("");
          data;
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (e: any) {
      console.log(e, e.message, e.stack);
    }
  });

  test("Watch wallet balance", async () => {
    const aliceWallet = await RegTestWallet.fromId(aliceWif);

    let result = false;
    aliceWallet.watchBalance((balance) => {
      expect(balance.bch).toBeGreaterThan(0);
      result = true;
      // stop watching
      return true;
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // we do not trigger the callback upon subscription anymore
    expect(result).toBe(true);
  });

  test("Wait for block timeout", async () => {
    const provider = getNetworkProvider(Network.REGTEST);
    let promiseResult;
    const timeout = new Promise((resolve) =>
      setTimeout(resolve, 1000, "timeout")
    );
    await Promise.race([provider.waitForBlock(), timeout]).then(
      (result) => (promiseResult = result)
    );
    expect(promiseResult).toBe("timeout");
  });

  test("Wait for block success", async () => {
    const provider = getNetworkProvider(Network.REGTEST);

    const aliceWallet = await RegTestWallet.fromId(aliceWif);
    const bobWallet = await RegTestWallet.newRandom();
    const minerWallet = await RegTestWallet.newRandom();

    await aliceWallet.send([
      {
        cashaddr: bobWallet.cashaddr!,
        value: 1000,
        unit: "satoshis",
      },
    ]);

    const height = await provider.getBlockHeight();

    setTimeout(
      async () => await mine({ cashaddr: minerWallet.cashaddr!, blocks: 1 }),
      2000
    );

    let header = await provider.waitForBlock();
    expect(header.height).toBe(height + 1);

    setTimeout(
      async () => await mine({ cashaddr: minerWallet.cashaddr!, blocks: 1 }),
      2000
    );

    header = await provider.waitForBlock(height + 2);
    expect(header.height).toBe(height + 2);
  }, 20000);
});
