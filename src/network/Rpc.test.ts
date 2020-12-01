import { Connection } from "./Connection";
import { Wallet, TestNetWallet } from "../wallet/Wif";
import { getTestnetProvider } from "../network/default";

test("subcribe to address", async () => {
  process.setMaxListeners(0);
  let BCH = new Connection("testnet");
  await BCH.ready();
  try {
    await BCH.networkProvider.subscribeToAddress("bchtest:qzvnjv8xyfkq4uk0xggsfu6uxnray06rcuw7h4zk4u", async (data) => {
      console.log("First", data);
    });

    await new Promise( resolve => setTimeout(resolve, 100000) );
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
    await BCH.networkProvider.subscribeToAddress("bchtest:qzvnjv8xyfkq4uk0xggsfu6uxnray06rcuw7h4zk4u", async (data) => {
      console.log("First", data);
      response1 = data;
    });

    await BCH.networkProvider.subscribeToAddress("bchtest:qzt6sz836wdwscld0pgq2prcpck2pssmwge9q87pe9", async (data) => {
      console.log("Second", data);
      response2 = data;
    });

    await new Promise( resolve => setTimeout(resolve, 100000) );
  } catch (e) {
    console.log(e, e.message, e.stack);
  } finally {
    await BCH.disconnect();
  }
});

test("Watch wallet balance", async () => {
  return;
  let w = await TestNetWallet.fromId(
    "wif:testnet:cQg8TvWc1pZdEh5svFh4AnKjyonZmtjZuTz7xaGXrZTgqScb6vef"
  );
  w.provider = getTestnetProvider(false, true);
  w.provider!.connect();

  await w.watchBalance((balance) => console.log(balance));
  await new Promise( resolve => setTimeout(resolve, 100000) );
});