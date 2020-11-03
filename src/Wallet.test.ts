import { UnitEnum, WalletTypeEnum } from "./wallet/enum";
import { bchParam } from "./chain";
import { Wallet, RegTestWallet, TestNetWallet } from "./wallet/Wif";
import { createWallet } from "./wallet/createWallet";
import { BalanceResponse } from "./util/balanceObjectFromSatoshi";
import { getUsdRate } from "./util/getUsdRate";

describe(`Test Wallet library`, () => {
  /**
   * Create the browser and page context
   */
  beforeEach(async () => {});

  test("Should get the regtest wallet balance", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = (await RegTestWallet.fromWIF(
        process.env.PRIVATE_WIF
      )) as RegTestWallet; // insert WIF from #1
      // Build Bob's wallet from a public address, check his balance.
      const aliceBalance = (await alice.getBalance()) as BalanceResponse;
      expect(aliceBalance.bch).toBeGreaterThan(5000);
      expect(await alice.getBalance("sat")).toBeGreaterThan(
        5000 * bchParam.subUnits
      );
    }
  });

  test("Should get a random regtest wallet", async () => {
    let alice = (await RegTestWallet.newRandom(
      "alice_random"
    )) as RegTestWallet;
    expect(alice.cashaddr!.slice(0, 8)).toBe("bchreg:q");
    expect(alice.getDepositAddress()!.slice(0, 8)).toBe("bchreg:q");
    const aliceBalance = (await alice.getBalance()) as BalanceResponse;
    expect(aliceBalance.bch).toBe(0);
    expect(aliceBalance.usd).toBe(0);
    expect(await alice.getBalance("sat")).toBe(0);
  });

  test("Should get the regtest wallet balance", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = (await RegTestWallet.fromWIF(
        process.env.PRIVATE_WIF
      )) as RegTestWallet; // insert WIF from #1
      // Build Bob's wallet from a public address, check his balance.
      const aliceBalance = (await alice.getBalance()) as BalanceResponse;
      expect(aliceBalance.bch).toBeGreaterThan(5000);
      expect(await alice.getBalance("sat")).toBeGreaterThan(
        5000 * bchParam.subUnits
      );
    }
  });

  test("Should get a regtest wallet fromId", async () => {
    let alice = (await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF}`
    )) as RegTestWallet;
    expect(alice.cashaddr!.slice(0, 8)).toBe("bchreg:q");
    expect(alice.getDepositAddress()!.slice(0, 8)).toBe("bchreg:q");
  });

  test("Should get a testnet wallet fromId", async () => {
    let alice = (await TestNetWallet.fromId(
      `wif:testnet:${process.env.PRIVATE_WIF}`
    )) as TestNetWallet;
    expect(alice.cashaddr!.slice(0, 9)).toBe("bchtest:q");
  });

  test("Should get a wallet fromId", async () => {
    let alice = (await Wallet.newRandom()) as Wallet;
    let alice2 = (await Wallet.fromId(
      `wif:mainnet:${alice.privateKeyWif}`
    )) as Wallet;
    expect(alice2.cashaddr).toBe(alice.cashaddr);
    expect(alice.getDepositAddress()!.slice(0, 13)).toBe("bitcoincash:q");
  });

  test("Should throw error on wif/network mismatch", async () => {
    expect.assertions(1);
    try {
      await Wallet.fromId(`wif:mainnet:${process.env.PRIVATE_WIF}`);
    } catch (e) {
      expect(e.message).toBe(
        "Mainnet type wif cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6 passed, should start with L or K"
      );
    }
  });

  test("Should also throw error on wif/network mismatch", async () => {
    expect.assertions(1);
    try {
      await TestNetWallet.fromId(
        `wif:testnet:KysvoRyDkxQycBGj49K8oC3minAfoXnVmkcgx6UsZx3g2VvyGCAa`
      );
    } catch (e) {
      expect(e.message).toBe(
        "Testnet type wif KysvoRyDkxQycBGj49K8oC3minAfoXnVmkcgx6UsZx3g2VvyGCAa passed, should start with c"
      );
    }
  });

  test("Should get an error passing wrong walletType", async () => {
    expect.assertions(1);
    try {
      await RegTestWallet.fromId(`hd:regtest:${process.env.PRIVATE_WIF}`);
    } catch (e) {
      expect(e.message.slice(0, 97)).toBe(
        "Wallet type hd was passed to single address wallet"
      );
    }
  });

  test("Should get an error passing wrong network to fromId", async () => {
    expect.assertions(1);
    try {
      await TestNetWallet.fromId(`wif:regtest:${process.env.PRIVATE_WIF}`);
    } catch (e) {
      expect(e.message.slice(0, 97)).toBe(
        "Network prefix regtest to a testnet wallet"
      );
    }
  });

  test("Should get the regtest wallet balance", async () => {
    // Build Alice's wallet from Wallet Import Format string, check sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = (await RegTestWallet.fromId(
        `wif:regtest:${process.env.PRIVATE_WIF}`
      )) as RegTestWallet; // insert WIF from #1
      expect(await alice.getBalance("sat")).toBeGreaterThan(
        5000 * bchParam.subUnits
      );
    }
  });

  test("Send a transaction on the regression network", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = (await RegTestWallet.fromWIF(
        process.env.PRIVATE_WIF
      )) as RegTestWallet; // insert WIF from #1
      const bob = await createWallet({
        type: WalletTypeEnum.Wif,
        network: "regtest",
      });
      let sendResponse = await alice.send([
        {
          cashaddr: bob.cashaddr!,
          value: 1100,
          unit: "satoshis",
        },
      ]);
      expect(sendResponse!.txId!.length).toBe(64);
      expect(sendResponse.balance!.bch).toBeGreaterThan(0.01);
      // Build Bob's wallet from a public address, check his balance.
      const bobBalance = (await bob.getBalance()) as BalanceResponse;
      expect(bobBalance.sat).toBe(1100);
    }
  });

  test("Send a transaction in dollars regression network", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = (await RegTestWallet.fromWIF(
        process.env.PRIVATE_WIF
      )) as RegTestWallet; // insert WIF from #1
      const bob = await createWallet({
        type: WalletTypeEnum.Wif,
        network: "regtest",
      });
      let usdRate = await getUsdRate();
      await alice.send([[bob.cashaddr!, usdRate, "Usd"]]);
      // Build Bob's wallet from a public address, check his balance.
      const bobBalance = (await bob.getBalance()) as BalanceResponse;

      expect(Math.round(bobBalance.usd!)).toBe(Math.round(usdRate));
    }
  });

  test("Send a transaction (as array) on the regression network", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats
    if (!process.env.PRIVATE_WIF) {
      throw Error("Attempted to pass an empty WIF");
    } else {
      let alice = (await RegTestWallet.fromWIF(
        process.env.PRIVATE_WIF
      )) as RegTestWallet; // insert WIF from #1
      const bob = await createWallet({
        network: "regtest",
      });
      await alice.send([[bob.cashaddr!, 1200, UnitEnum.SAT]]);
      // Build Bob's wallet from a public address, check his balance.
      const bobBalance = (await bob.getBalance()) as BalanceResponse;
      expect(bobBalance.sat).toBe(1200);
    }
  });

  test("Should get a random testnet wallet", async () => {
    let alice = (await TestNetWallet.newRandom()) as TestNetWallet;
    const aliceBalance = (await alice.getBalance()) as BalanceResponse;
    expect(alice.cashaddr!.slice(0, 9)).toBe("bchtest:q");
    expect(aliceBalance.bch).toBe(0);
    expect(aliceBalance.usd).toBe(0);
    expect(await alice.getBalance("sat")).toBe(0);
  });

  test("Should get a large number of utxos", async () => {
    let reid = await Wallet.watchOnly(
      "bitcoincash:qr6cwfje4mv2q7srq5rav0up8ahc68hrtsy6ee7tk2"
    );
    const reidBalance = (await reid.getBalance()) as BalanceResponse;
    const reidUtxos = await reid.getUtxos();
    expect(reidUtxos.utxos!.length).toBeGreaterThan(0);

    expect(reid.getDepositAddress()!).toBe(
      "bitcoincash:qr6cwfje4mv2q7srq5rav0up8ahc68hrtsy6ee7tk2"
    );
    expect(reidBalance.bch).toBeGreaterThan(0);
    expect(reidBalance.usd).toBeGreaterThan(0);
    expect(typeof (await reid.getBalance("sat"))).toBe("number");
  });

  test("Send a transaction on testnet, send it  back", async () => {
    // Build Alice's wallet from Wallet Import Format string, send some sats

    if (!process.env.ALICE_TESTNET_WALLET_ID) {
      throw Error("Missing testnet env keys");
    }
    const alice = (await TestNetWallet.fromId(
      process.env.ALICE_TESTNET_WALLET_ID
    )) as TestNetWallet;
    const bob = await createWallet({
      type: WalletTypeEnum.Wif,
      network: "testnet",
      name: "Bob's random wallet",
    });

    if (!alice.cashaddr || !bob.cashaddr) {
      throw Error("Alice or Bob's wallet are missing addresses");
    }
    if (!alice.privateKey || !bob.privateKey) {
      throw Error("Alice or Bob's wallet are missing private ke");
    }
    await alice.send([
      {
        cashaddr: bob.cashaddr,
        value: 1100,
        unit: UnitEnum.SAT,
      },
    ]);

    // Build Bob's wallet from a public address, check his balance.

    const sendMaxResponse = await bob.sendMax(alice.cashaddr);
    expect(sendMaxResponse.txId.length).toBe(64);

    const bobBalanceFinal = (await bob.getBalance()) as BalanceResponse;
    expect(bobBalanceFinal.sat).toBe(0);
  });
});
