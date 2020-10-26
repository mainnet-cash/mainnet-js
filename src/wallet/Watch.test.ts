import { WatchWallet, TestNetWatchWallet, RegTestWatchWallet } from "./Watch";
import { BalanceResponse } from "../util/balanceObjectFromSatoshi";
import { bchParam } from "../chain";

test("Create a watch only testnet wallet from string id", async () => {
  let w = (await TestNetWatchWallet.fromId(
    "watch:testnet:qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22"
  )) as WatchWallet;
  expect(w.network).toBe("testnet");
  expect(w.networkPrefix).toBe("bchtest");
  expect(w.cashaddr).toBe("qppr9h7whx9pzucgqukhtlj8lvgvjlgr3g9ggtkq22");
});

test("Create a watch only mainnet wallet from string id", async () => {
  let w = (await WatchWallet.fromId(
    "watch:mainnet:qp6e6enhpy0fwwu7nkvlr8rgl06ru0c9lywalz8st5"
  )) as WatchWallet;
  expect(w.network).toBe("mainnet");
  expect(w.networkPrefix).toBe("bitcoincash");
  expect(w.cashaddr).toBe("qp6e6enhpy0fwwu7nkvlr8rgl06ru0c9lywalz8st5");
});

test("Should get the regtest wallet balance", async () => {
    // Build Alice's wallet from WifWallet Import Format string, send some sats
    if (!process.env.ADDRESS) {
      throw Error("Attempted to pass an empty address");
    } else {
      let alice = (await RegTestWatchWallet.initialize(
        process.env.ADDRESS
      )) as RegTestWatchWallet; // insert WIF from #1
      // Build Bob's wallet from a public address, check his balance.
      const aliceBalance = (await alice.getBalance()) as BalanceResponse;
      expect(aliceBalance.bch).toBeGreaterThan(5000);
      expect(await alice.getBalance("sat")).toBeGreaterThan(
        5000 * bchParam.subUnits
      );
    }
  });

  test("Should get the testnet wallet balance", async () => {
    // Build Alice's wallet from WifWallet Import Format string, send some sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = (await TestNetWatchWallet.initialize(
        process.env.ALICE_TESTNET_ADDRESS
      )) as TestNetWatchWallet; // insert WIF from #1
      // Build Bob's wallet from a public address, check his balance.
      const aliceBalance = (await alice.getBalance()) as BalanceResponse;
      expect(aliceBalance.sat).toBeGreaterThan(2000);
    }
  });