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
    expect(await page.title()).toEqual("Load module for playwright");
  });

  test(`Should load module`, async () => {
    expect(page).not.toBeNull();
    const result = await page.evaluate(async () => {
      return await typeof RegTestWallet;
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

  test(`Should create regtest wallet`, async () => {
    let params = { name: "Alice's regtest", type: "wif", network: "regtest" };
    const result = await page.evaluate(async (p) => {
      return await createWalletResponse(p);
    }, params);
    expect(result.cashaddr.slice(0, 8)).toBe("bchreg:q");
  });

  test(`Should throw Error on regtest wif to testnet wallet`, async () => {
    expect.assertions(1);
    try {
      const result = await page.evaluate(async (wif) => {
        return await TestNetWallet.fromId(`wif:regtest:${wif}`);
      }, process.env.PRIVATE_WIF);
    } catch (e) {
      expect(e.message.split("\n")[0]).toBe(
        "page.evaluate: Evaluation failed: Error: Network prefix regtest to a testnet wallet"
      );
    }
  });

  test(`Should throw Error on regtest hd to regtest wif`, async () => {
    expect.assertions(1);
    try {
      const result = await page.evaluate(async (wif) => {
        return await RegTestWallet.fromId(`hd:regtest:${wif}`);
      }, process.env.PRIVATE_WIF);
    } catch (e) {
      expect(e.message.split("\n")[0]).toBe(
        "page.evaluate: Evaluation failed: Error: Wallet type hd was passed to single address wallet"
      );
    }
  });

  test(`Should create a random regtest wallet`, async () => {
    let params = {};
    const result = await page.evaluate(async (p) => {
      let w = await RegTestWallet.newRandom();
      return w.getDepositAddress();
    }, params);
    expect(result.slice(0, 8)).toBe("bchreg:q");
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

  test(`Should return deposit address from regtest wallet`, async () => {
    const result = await page.evaluate(async (wif) => {
      const alice = await RegTestWallet.fromWIF(wif);
      return alice.getDepositAddress();
    }, process.env.PRIVATE_WIF);
    expect(result.slice(0, 9)).toBe("bchreg:qp");
  });

  test(`Should return deposit qr from regtest wallet`, async () => {
    const result = await page.evaluate(async (wif) => {
      const alice = await RegTestWallet.fromWIF(wif);
      return alice.getDepositQr();
    }, process.env.PRIVATE_WIF);
    expect(
      result.src.startsWith("data:image/svg+xml;base64,PD94bWwgdm")
    ).toBeTruthy();
  });

  test(`Should return deposit address from regtest wallet`, async () => {
    const result = await page.evaluate(async (wif) => {
      const alice = await RegTestWallet.fromWIF(wif);
      return alice.getDepositAddress();
    }, process.env.PRIVATE_WIF);
    expect(result.slice(0, 8)).toBe("bchreg:q");
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
        "SKIPPING regtest balance test, set ALICE_TESTNET_ADDRESS env"
      );
    }
  });

  test(`Should return watch named balance`, async () => {
    const result = await page.evaluate(async () => {
      const alice = await RegTestWallet.named("alice");
      return alice.getBalance("sat");
    });
    expect(result).toBe(0);
  });

  test(`Should return reterive a named wallet`, async () => {
    const result = await page.evaluate(async () => {
      const alice = await RegTestWallet.named("alice");
      const alice2 = await RegTestWallet.named("alice");
      return [alice.cashaddr, alice2.cashaddr];
    }, undefined);
    expect(result[0]).toBe(result[1]);
  });

  test(`Should return regtest balance in usd`, async () => {
    if (process.env.ADDRESS) {
      const result = await page.evaluate(async (addr) => {
        const alice = await RegTestWallet.watchOnly(addr);
        return alice.getBalance("usd");
      }, process.env.ADDRESS);
      expect(result).toBeGreaterThan(0);
    } else {
      expect.assertions(1);
      console.warn("SKIPPING regtest balance test, set ADDRESS");
    }
  });

  test(`Should return regtest balance in usd`, async () => {
    const result = await page.evaluate(async () => {
      return await Mainnet.convert(1, "bch", "sat");
    });
    expect(result).toBe(100000000);
  });

  test(`Should send to Bob; sendMax all of Bob's funds back`, async () => {
    if (process.env.PRIVATE_WIF) {
      const result = await page.evaluate(
        async (args) => {
          const alice = await RegTestWallet.fromWIF(args[0]);
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
        },
        [process.env.PRIVATE_WIF]
      );
      expect(result.balance.sat).toBe(0);
    } else {
      expect.assertions(1);
      console.warn(
        "SKIPPING regtest maxAmountToSend test, set PRIVATE_WIF env"
      );
    }
  });
});
