import {
  BaseWallet,
  Config,
  convert,
  createWallet,
  createWalletResponse,
  RegTestWallet,
  SignedMessage,
  TestNetWallet,
  Wallet,
  WalletTypeEnum,
  walletFromId,
} from "mainnet-js";
import { IndexedDBProvider } from "./index.js";

describe("Wallet should function in the browser", () => {
  beforeAll(() => {
    BaseWallet.StorageProvider = IndexedDBProvider;
  });

  test("Should load module", async () => {
    expect(typeof TestNetWallet).toEqual("function");
  });

  test("Should create regtest wallet", async () => {
    const result = await createWalletResponse({
      name: "Alice's Regtest",
      type: WalletTypeEnum.Wif,
      network: "regtest",
    });
    expect(result.cashaddr!.slice(0, 8)).toBe("bchreg:q");
  });

  test("Should create testnet wallet", async () => {
    const result = await createWalletResponse({
      name: "Alice's TestNet",
      type: WalletTypeEnum.Wif,
      network: "testnet",
    });
    expect(result.cashaddr!.slice(0, 9)).toBe("bchtest:q");
  });

  test("Should throw Error on regtest wif to Testnet", async () => {
    expect.assertions(1);
    try {
      await TestNetWallet.fromId(`wif:regtest:${process.env.PRIVATE_WIF}`);
    } catch (e: any) {
      expect(e.message).toContain("Network prefix regtest to a testnet wallet");
    }
  });

  test("Should throw Error on regtest hd to regtest wif", async () => {
    expect.assertions(1);
    try {
      await TestNetWallet.fromId(`hd:testnet:${process.env.PRIVATE_WIF}`);
    } catch (e: any) {
      expect(e.message).toContain("Unknown wallet type 'hd'");
    }
  });

  test("Should create a random testnet wallet", async () => {
    const w = await TestNetWallet.newRandom();
    const result = w.getDepositAddress();
    expect(result.slice(0, 9)).toBe("bchtest:q");
  });

  test("Should create mainnet wallet", async () => {
    const w = await Wallet.newRandom();
    const result = w.getDepositAddress();
    expect(result.slice(0, 13)).toBe("bitcoincash:q");
  });

  test("Should get an empty balance from a mainnet wallet", async () => {
    const w = await Wallet.newRandom();
    const result = await w.getBalance();
    expect(result).toBe(0n);
  });

  test("Should return deposit address from testnet wallet", async () => {
    const alice = await TestNetWallet.fromWIF(process.env.PRIVATE_WIF!);
    const result = alice.getDepositAddress();
    expect(result.slice(0, 9)).toBe("bchtest:q");
  });

  test("Should return watch testnet balance", async () => {
    if (process.env.ALICE_TESTNET_ADDRESS) {
      const alice = await TestNetWallet.watchOnly(
        process.env.ALICE_TESTNET_ADDRESS,
      );
      const result = await alice.getBalance();
      expect(result).toBeGreaterThan(0n);
    }
  });

  test("Should return watch named balance", async () => {
    if (process.env.ALICE_TESTNET_ADDRESS) {
      const alice = await TestNetWallet.named("alice");
      const result = await alice.getBalance();
      expect(result).toBe(0n);
    }
  });

  test("Should retrieve a named wallet", async () => {
    const alice = await TestNetWallet.named("alice");
    const alice2 = await TestNetWallet.named("alice");
    expect(alice.cashaddr).toBe(alice2.cashaddr);
  });

  test("Should return testnet balance in usd", async () => {
    if (process.env.ALICE_TESTNET_ADDRESS) {
      const alice = await TestNetWallet.watchOnly(
        process.env.ALICE_TESTNET_ADDRESS,
      );
      const result = await alice.getBalance();
      expect(result).toBeGreaterThan(0);
    }
  });

  test("Should convert bch to sat", async () => {
    const result = await convert(1, "bch", "sat");
    expect(result).toBe(100000000);
  });

  test("Should sign a message and verify it", async () => {
    const alice = await walletFromId(`wif:regtest:${process.env.PRIVATE_WIF}`);
    const result = SignedMessage.sign("test", alice.privateKey!);
    const verifyResult = SignedMessage.verify(
      "test",
      result.signature,
      alice.cashaddr!,
    );
    expect(result.signature).toBe(
      "IOEEiqRXRVK9gPUNpXuBjJUK47Y8XpseZejgwu59CoNSVv+3K1NkHdT64RXHP7cw4PZ6usRQ4ULrP/p5CJnrg9U=",
    );
    expect(verifyResult.valid).toBe(true);
  });

  test("Should send to Bob; sendMax all of Bob's funds back", async () => {
    const alice = await walletFromId(`wif:regtest:${process.env.PRIVATE_WIF}`);
    const bob = await createWallet({
      type: WalletTypeEnum.Wif,
      network: "regtest",
      name: "Bob's random wallet",
    });
    await alice.send([{ cashaddr: bob.cashaddr!, value: 3000n }]);
    const result = await bob.sendMax(alice.cashaddr!);
    expect(result.balance).toBe(0n);
  });

  test("Store and replace a Regtest wallet", async () => {
    const name = `storereplace ${Math.random()}`;

    const check1 = await RegTestWallet.namedExists(name);
    const w1 = await RegTestWallet.named(name);
    const check2 = await RegTestWallet.namedExists(name);

    const seedId = (
      await RegTestWallet.fromSeed(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      )
    ).toDbString();
    const w3 = await RegTestWallet.replaceNamed(name, seedId);
    const w4 = await RegTestWallet.named(name);

    const w5 = await RegTestWallet.replaceNamed(`${name}_nonexistent`, seedId);
    const w6 = await RegTestWallet.named(`${name}_nonexistent`);

    expect(check1).toBe(false);
    expect(check2).toBe(true);
    expect(w4.toDbString()).not.toBe(w1.toDbString());
    expect(w4.toDbString()).toBe(seedId);
    expect(w6.toDbString()).toBe(w5.toDbString());
  });

  test("Test waiting and watching", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();

    let waitTxResult = false;
    setTimeout(async () => {
      const result = await alice.waitForTransaction({
        getBalance: true,
        getTransactionInfo: true,
      });
      expect(result.balance).toBeGreaterThan(0n);
      expect(result.transactionInfo!.hash.length).toBe(64);
      waitTxResult = true;
    }, 0);

    let waitBalanceResult = false;
    setTimeout(async () => {
      const result = await alice.waitForBalance(100000n);
      expect(result).toBeGreaterThan(0n);
      waitBalanceResult = true;
    }, 0);

    let bobBalanceWatchResult = false;
    const bobBalanceWatchCancel = await bob.watchBalance(
      async (balance: bigint) => {
        if (!balance) return;
        expect(balance).toBeGreaterThanOrEqual(100000n);
        await bobBalanceWatchCancel();
        bobBalanceWatchResult = true;
      },
    );

    await alice.send({
      cashaddr: bob.getDepositAddress(),
      value: 100000n,
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));
    expect(waitTxResult).toBe(true);
    expect(waitBalanceResult).toBe(true);
    expect(bobBalanceWatchResult).toBe(true);
  });

  test("Should use localStorage cache for transactions", async () => {
    const aliceWallet = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const txDecoded = await aliceWallet.getLastTransaction();
    expect(txDecoded === null).toBe(false);
    const txHash = txDecoded!.hash;
    expect(
      localStorage.getItem(`tx-${aliceWallet.provider!.network}-${txHash}`),
    ).toBe(null);
    Config.UseLocalStorageCache = true;
    await aliceWallet.provider!.getRawTransaction(txHash);
    await aliceWallet.provider!.getRawTransaction(txHash, true);

    expect(
      localStorage.getItem(
        `txraw-${aliceWallet.provider!.network}-${txHash}`,
      ) === null,
    ).toBe(false);
    expect(
      typeof localStorage.getItem(
        `txraw-${aliceWallet.provider!.network}-${txHash}`,
      ) === "string",
    ).toBe(true);
    expect(typeof (await aliceWallet.provider!.getRawTransaction(txHash))).toBe(
      "string",
    );

    expect(
      localStorage.getItem(`tx-${aliceWallet.provider!.network}-${txHash}`) ===
        null,
    ).toBe(false);
    expect(
      typeof (await aliceWallet.provider!.getRawTransaction(txHash, true)),
    ).toBe("object");

    Config.UseLocalStorageCache = false;
  });

  test("Should use localStorage cache for block headers", async () => {
    const aliceWallet = await Wallet.newRandom();
    const height = 854724;
    await aliceWallet.provider!.getHeader(854724);
    expect(
      localStorage.getItem(
        `header-${aliceWallet.provider!.network}-${height}-${false}`,
      ),
    ).toBe(null);
    Config.UseLocalStorageCache = true;
    await aliceWallet.provider!.getHeader(854724);
    await aliceWallet.provider!.getHeader(854724, true);

    expect(
      localStorage.getItem(
        `header-${aliceWallet.provider!.network}-${height}-${false}`,
      ) === null,
    ).toBe(false);
    expect(typeof (await aliceWallet.provider!.getHeader(854724))).toBe(
      "object",
    );

    Config.UseLocalStorageCache = false;
  });
});
