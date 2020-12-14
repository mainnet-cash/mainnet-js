import { Connection, disconnectProviders, initProviders } from "./Connection";
import { Wallet, TestNetWallet, RegTestWallet } from "../wallet/Wif";
import { getNetworkProvider } from "../network/default";
import { Network } from "cashscript";
import { mine } from "../mine";

beforeAll(async () => {
  await initProviders([Network.REGTEST]);
});

afterAll(async () => {
  await disconnectProviders([Network.REGTEST]);
});

test("subcribe to address", async () => {
  process.setMaxListeners(0);
  let BCH = new Connection("testnet");
  await BCH.ready();
  try {
    await BCH.networkProvider.subscribeToAddress(
      "bchtest:qzvnjv8xyfkq4uk0xggsfu6uxnray06rcuw7h4zk4u",
      async (data) => {
        console.log("First", data);
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (e) {
    console.log(e, e.message, e.stack);
  } finally {
    await BCH.disconnect();
  }
});

test("subcribe to muliple addresses bug", async () => {
  process.setMaxListeners(0);
  let BCH = new Connection("testnet");
  await BCH.ready();
  try {
    let response1 = undefined;
    let response2 = undefined;
    await BCH.networkProvider.subscribeToAddress(
      "bchtest:qzvnjv8xyfkq4uk0xggsfu6uxnray06rcuw7h4zk4u",
      async (data) => {
        console.log("First", data);
        response1 = data;
      }
    );

    await BCH.networkProvider.subscribeToAddress(
      "bchtest:qzt6sz836wdwscld0pgq2prcpck2pssmwge9q87pe9",
      async (data) => {
        console.log("Second", data);
        response2 = data;
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (e) {
    console.log(e, e.message, e.stack);
  } finally {
    await BCH.disconnect();
  }
});

test("Watch wallet balance", async () => {
  let w = await TestNetWallet.fromId(
    "wif:testnet:cQg8TvWc1pZdEh5svFh4AnKjyonZmtjZuTz7xaGXrZTgqScb6vef"
  );
  w.provider = getNetworkProvider(Network.TESTNET, undefined, true);
  w.provider!.connect();

  await w.watchBalance((balance) => console.log(balance));
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

test("Wait for block timeout", async () => {
  const provider = getNetworkProvider(Network.REGTEST);
  let promiseResult;
  const timeout = new Promise((resolve) => setTimeout(resolve, 1000, 'timeout'));
  await Promise.race([provider.waitForBlock(), timeout]).then(result => promiseResult = result);
  expect(promiseResult).toBe("timeout");
});

test("Wait for block success", async () => {
  const provider = getNetworkProvider(Network.REGTEST);

  const aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;
  const aliceWallet = await RegTestWallet.fromId(aliceWif);
  const bobWallet = await RegTestWallet.newRandom();

  await aliceWallet.send([
    {
      cashaddr: bobWallet.cashaddr!,
      value: 1000,
      unit: "satoshis",
    },
  ]);

  const height = await provider.getBlockHeight();

  new Promise((resolve) => setTimeout(() => {
    mine({ cashaddr: process.env.ADDRESS!, blocks: 1 });
    resolve(true);
  }, 100));

  let header = await provider.waitForBlock();
  expect(header.height).toBe(height + 1)

  new Promise((resolve) => setTimeout(() => {
    mine({ cashaddr: process.env.ADDRESS!, blocks: 2 });
    resolve(true);
  }, 100));

  header = await provider.waitForBlock(height + 3);
  expect(header.height).toBe(height + 3)
});
