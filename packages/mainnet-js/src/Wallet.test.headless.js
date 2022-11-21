const playwright = require("playwright");
const PAGE_URL = "http://localhost:8080";

describe(`Wallet should function in the browser`, () => {
  let browser = null;
  let page = null;

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

  test(`Should load page`, async () => {
    expect(page).not.toBeNull();
    expect(await page.title()).toEqual("The Empty Mainnet App");
  });

  test(`Should load module`, async () => {
    expect(page).not.toBeNull();
    const result = await page.evaluate(async () => {
      return await typeof TestNetWallet;
    });
    expect(result).toEqual("function");
  });

  test(`Should not have a "process"`, async () => {
    expect(page).not.toBeNull();
    const result = await page.evaluate(async () => {
      return typeof process;
    });
    expect(result).toEqual("undefined");
  });

  test(`Should create regtest wallet`, async () => {
    let params = { name: "Alice's Regtest", type: "wif", network: "regtest" };
    const result = await page.evaluate(async (p) => {
      return await createWalletResponse(p);
    }, params);
    expect(result.cashaddr.slice(0, 8)).toBe("bchreg:q");
  });

  test(`Should create testnet wallet`, async () => {
    let params = { name: "Alice's TestNet", type: "wif", network: "testnet" };
    const result = await page.evaluate(async (p) => {
      return await createWalletResponse(p);
    }, params);
    expect(result.cashaddr.slice(0, 9)).toBe("bchtest:q");
  });

  test(`Should throw Error on regtest wif to Testnet`, async () => {
    expect.assertions(1);
    try {
      const result = await page.evaluate(async (wif) => {
        return await TestNetWallet.fromId(`wif:regtest:${wif}`);
      }, process.env.PRIVATE_WIF);
    } catch (e) {
      expect(e.message.split("\n")[0]).toContain(
        "Error: Network prefix regtest to a testnet wallet"
      );
    }
  });

  test(`Should throw Error on regtest hd to regtest wif`, async () => {
    expect.assertions(1);
    try {
      const result = await page.evaluate(async (wif) => {
        return await TestNetWallet.fromId(`hd:testnet:${wif}`);
      }, process.env.PRIVATE_WIF);
    } catch (e) {
      expect(e.message.split("\n")[0]).toContain(
        "Error: Unknown wallet type 'hd'"
      );
    }
  });

  test(`Should create a random testnet wallet`, async () => {
    let params = {};
    const result = await page.evaluate(async (p) => {
      let w = await TestNetWallet.newRandom();
      return w.getDepositAddress();
    }, params);
    expect(result.slice(0, 9)).toBe("bchtest:q");
  });

  test(`Should create mainnet wallet`, async () => {
    const result = await page.evaluate(async (p) => {
      let w = await Wallet.newRandom();
      return w.getDepositAddress();
    });
    expect(result.slice(0, 13)).toBe("bitcoincash:q");
  });

  test(`Should get an empty balance from a mainnet wallet`, async () => {
    const result = await page.evaluate(async (p) => {
      let w = await Wallet.newRandom();
      return w.getBalance();
    });
    expect(result.sat).toBe(0);
  });

  test(`Should return deposit address from testnet wallet`, async () => {
    const result = await page.evaluate(async (wif) => {
      const alice = await TestNetWallet.fromWIF(wif);
      return alice.getDepositAddress();
    }, process.env.PRIVATE_WIF);
    expect(result.slice(0, 10)).toBe("bchtest:qp");
  });

  test(`Should return deposit qr from testnet wallet`, async () => {
    const result = await page.evaluate(async (wif) => {
      const alice = await TestNetWallet.fromWIF(wif);
      return alice.getDepositQr();
    }, process.env.PRIVATE_WIF);
    expect(
      result.src.startsWith("data:image/svg+xml;base64,PD94bWwgdm")
    ).toBeTruthy();
  });

  test(`Should return deposit address from testnet wallet`, async () => {
    const result = await page.evaluate(async (wif) => {
      const alice = await TestNetWallet.fromWIF(wif);
      return alice.getDepositAddress();
    }, process.env.PRIVATE_WIF);
    expect(result.slice(0, 9)).toBe("bchtest:q");
  });

  test(`Should return watch testnet balance`, async () => {
    if (process.env.ALICE_TESTNET_ADDRESS) {
      const result = await page.evaluate(async (addr) => {
        const alice = await TestNetWallet.watchOnly(addr);
        return alice.getBalance("sat");
      }, process.env.ALICE_TESTNET_ADDRESS);
      expect(result).toBeGreaterThan(0);
    } else {
      expect.assertions(1);
      console.warn(
        "SKIPPING testnet balance test, set ALICE_TESTNET_ADDRESS env"
      );
    }
  });

  test(`Should return watch named balance`, async () => {
    if (process.env.ALICE_TESTNET_ADDRESS) {
      const result = await page.evaluate(async (addr) => {
        const alice = await TestNetWallet.named("alice");
        return alice.getBalance("sat");
      }, process.env.ALICE_TESTNET_ADDRESS);
      expect(result).toBe(0);
    } else {
      expect.assertions(1);
      console.warn(
        "SKIPPING testnet balance test, set ALICE_TESTNET_ADDRESS env"
      );
    }
  });

  test(`Should return reterive a named wallet`, async () => {
    const result = await page.evaluate(async () => {
      const alice = await TestNetWallet.named("alice");
      const alice2 = await TestNetWallet.named("alice");
      return [alice.cashaddr, alice2.cashaddr];
    }, undefined);
    expect(result[0]).toBe(result[1]);
  });

  test(`Should return testnet balance in usd`, async () => {
    if (process.env.ALICE_TESTNET_ADDRESS) {
      const result = await page.evaluate(async (addr) => {
        const alice = await TestNetWallet.watchOnly(addr);
        return alice.getBalance("usd");
      }, process.env.ALICE_TESTNET_ADDRESS);
      expect(result).toBeGreaterThan(0);
    } else {
      expect.assertions(1);
      console.warn(
        "SKIPPING testnet balance test, set ALICE_TESTNET_ADDRESS env"
      );
    }
  });

  test(`Should return testnet balance in usd`, async () => {
    const result = await page.evaluate(async () => {
      return await Mainnet.convert(1, "bch", "sat");
    });
    expect(result).toBe(100000000);
  });

  test(`Should sign a message and verify it`, async () => {
    const result = await page.evaluate(async (wif) => {
      const alice = await walletFromId(`wif:regtest:${wif}`);
      let result = await alice.sign("test");
      return {
        resp: await alice.verify("test", result.signature),
        signature: result.signature,
      };
    }, process.env.PRIVATE_WIF);
    expect(result.signature).toBe(
      "IOEEiqRXRVK9gPUNpXuBjJUK47Y8XpseZejgwu59CoNSVv+3K1NkHdT64RXHP7cw4PZ6usRQ4ULrP/p5CJnrg9U="
    );
    expect(result.resp.valid).toBe(true);
  });

  test(`Should send to Bob; sendMax all of Bob's funds back`, async () => {
    const result = await page.evaluate(async (wif) => {
      const alice = await walletFromId(`wif:regtest:${wif}`);
      const bob = await createWallet({
        type: "wif",
        network: "regtest",
        name: "Bob's random wallet",
      });
      await alice.send([
        {
          cashaddr: bob.cashaddr,
          value: 3000,
          unit: "sat",
        },
      ]);
      return bob.sendMax(alice.cashaddr);
    }, process.env.PRIVATE_WIF);
    expect(result.balance.sat).toBe(0);
  });

  test("Store and replace a Regtest wallet", async () => {
    const result = await page.evaluate(async () => {
      const name = `storereplace ${Math.random()}`;

      const check1 = await RegTestWallet.namedExists(name);
      const w1 = await RegTestWallet.named(name);
      const check2 = await RegTestWallet.namedExists(name);

      const seedId = (
        await RegTestWallet.fromSeed(new Array(12).join("abandon "))
      ).toDbString();
      const w3 = await RegTestWallet.replaceNamed(name, seedId);
      const w4 = await RegTestWallet.named(name);

      const w5 = await RegTestWallet.replaceNamed(
        `${name}_nonexistent`,
        seedId
      );
      const w6 = await RegTestWallet.named(`${name}_nonexistent`);

      return {
        check1,
        check2,
        w1: w1.toDbString(),
        w4: w4.toDbString(),
        w5: w5.toDbString(),
        w6: w6.toDbString(),
        seedId,
      };
    });

    expect(result.check1).toBe(false);
    expect(result.check2).toBe(true);
    expect(result.w4).not.toBe(result.w1);
    expect(result.w4).toBe(result.seedId);
    expect(result.w6).toBe(result.w5);
  });

  test("Test waiting and watching", async () => {
    await page.evaluate(async (ALICE_ID) => {
      const alice = await RegTestWallet.fromId(ALICE_ID);

      const bob = await RegTestWallet.newRandom();

      let waitTxResult = false;
      setTimeout(async () => {
        const result = await alice.waitForTransaction({
          getBalance: true,
          getTransactionInfo: true,
        });
        expect(result.balance.sat).toBeGreaterThan(0);
        expect(result.transactionInfo.hash.length).toBe(64);
        waitTxResult = true;
      }, 0);

      let waitBalanceResult = false;
      setTimeout(async () => {
        const result = await alice.waitForBalance(0.001, "bch");
        expect(result.sat).toBeGreaterThan(0);
        waitBalanceResult = true;
      }, 0);

      // let aliceWatchResult = false;
      // const aliceWatchCancel = alice.watchAddressTransactions((_tx) => {
      //   aliceWatchCancel();
      //   aliceWatchResult = true;
      // });

      // let bobWatchResult = false;
      // const bobWatchCancel = bob.watchAddress((_txHash) => {
      //   bobWatchCancel();
      //   bobWatchResult = true;
      // });

      let bobBalanceWatchResult = false;
      const bobBalanceWatchCancel = bob.watchBalance((balance) => {
        expect(balance.bch).toBe(0.001);
        bobBalanceWatchCancel();
        bobBalanceWatchResult = true;
      });

      // let blockWatchResult = false;
      // const blockWatchCancel = bob.watchBlocks((block) => {
      //   expect(block.height).toBeGreaterThan(1);
      //   blockWatchCancel();
      //   blockWatchResult = true;
      // });

      // let blockWaitResult = false;
      // setTimeout(async () => {
      //   const blockNumber = await (
      //     alice.provider
      //   ).getBlockHeight();
      //   const result = await alice.waitForBlock();
      //   expect(result.height).toBe(blockNumber + 1);
      //   blockWaitResult = true;
      // }, 0);

      // let blockNumberWaitResult = false;
      // setTimeout(async () => {
      //   const blockNumber = await (
      //     alice.provider
      //   ).getBlockHeight();
      //   const result = await alice.waitForBlock(blockNumber + 2);
      //   expect(result.height).toBe(blockNumber + 2);
      //   blockNumberWaitResult = true;
      // }, 0);

      await alice.send({
        cashaddr: bob.getDepositAddress(),
        value: 0.001,
        unit: "bch",
      });

      //! mining not supported in browser
      // await mine({ cashaddr: alice.cashaddr, blocks: 1 });
      // await new Promise((resolve) => setTimeout(resolve, 1000));
      // await mine({ cashaddr: alice.cashaddr, blocks: 1 });

      await new Promise((resolve) => setTimeout(resolve, 5000));
      expect(waitTxResult).toBe(true);
      expect(waitBalanceResult).toBe(true);
      // expect(aliceWatchResult).toBe(true);
      // expect(bobWatchResult).toBe(true);
      expect(bobBalanceWatchResult).toBe(true);
      // expect(blockWatchResult).toBe(true);
      // expect(blockWaitResult).toBe(true);
      // expect(blockNumberWaitResult).toBe(true);
    }, process.env.ALICE_ID);
  });
});
