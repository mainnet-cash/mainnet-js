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

  test(`Should throw error on regtest wallet`, async () => {
    expect.assertions(1);
    let params = { name: "Alice's Testnet", type: "wif", network: "regtest" };
    try {
      const result = await page.evaluate(async (p) => {
        return await mainnet.createWalletResponse(p);
      }, params);
    } catch (e) {
      expect(e.message.slice(0, 97)).toBe(
        "page.evaluate: Evaluation failed: Error: This usage is not supported in the browser at this time."
      );
    }
  });

  test(`Should create testnet wallet`, async () => {
    let params = { name: "Alice's Testnet", type: "wif", network: "testnet" };
    const result = await page.evaluate(async (p) => {
      return await mainnet.createWalletResponse(p);
    }, params);
    expect(result.cashaddr.slice(0, 9)).toBe("bchtest:q");
  });

  test(`Should create mainnet wallet`, async () => {
    let params = { name: "Alice's Testnet", type: "wif", network: "mainnet" };
    const result = await page.evaluate(async (p) => {
      return await mainnet.createWalletResponse(p);
    }, params);
    expect(result.cashaddr.slice(0, 13)).toBe("bitcoincash:q");
  });

  test(`Should return deposit address from testnet wallet`, async () => {
    const result = await page.evaluate(async (wif) => {
      const alice = await mainnet.TestnetWallet.fromWIF(wif);
      return alice.getDepositAddress();
    }, process.env.PRIVATE_WIF);
    expect(result.cashaddr.startsWith("bchtest:qp")).toBeTruthy();
  });

  test(`Should return deposit qr from testnet wallet`, async () => {
    const result = await page.evaluate(async (wif) => {
      const alice = await mainnet.TestnetWallet.fromWIF(wif);
      return alice.getDepositQr();
    }, process.env.PRIVATE_WIF);
    expect(
      result.src.startsWith("data:image/svg+xml;base64,PD94bWwgdm")
    ).toBeTruthy();
  });

  test(`Should return deposit address from testnet wallet`, async () => {
    const result = await page.evaluate(async (wif) => {
      const alice = await mainnet.TestnetWallet.fromWIF(wif);
      return alice.getDepositAddress();
    }, process.env.PRIVATE_WIF);
    expect(result.cashaddr.startsWith("bchtest:qp")).toBeTruthy();
  });

  test(`Should return testnet balance`, async () => {
    if (process.env.ALICE_TESTNET_ADDRESS) {
      const result = await page.evaluate(async (addr) => {
        const alice = await mainnet.TestnetWallet.watchOnly(addr);
        return alice.getBalance();
      }, process.env.ALICE_TESTNET_ADDRESS);
      expect(result.sat).toBeGreaterThan(0);
    } else {
      expect.assertions(1);
      console.warn(
        "SKIPPING testnet balance test, set ALICE_TESTNET_ADDRESS env"
      );
    }
  });

  test(`Should return testnet balance in usd`, async () => {
    if (process.env.ALICE_TESTNET_ADDRESS) {
      const result = await page.evaluate(async (addr) => {
        const alice = await mainnet.TestnetWallet.watchOnly(addr);
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

  test(`Should send to Bob; sendMax all of Bob's funds back`, async () => {
    if (process.env.ALICE_TESTNET_WALLET_ID) {
      const result = await page.evaluate(
        async (args) => {
          const alice = await mainnet.walletFromIdString(args[0]);
          const bob = await mainnet.createWallet({
            type: "wif",
            network: "testnet",
            name: "Bob's random wallet",
          });
          await alice.send([
            {
              cashaddr: bob.cashaddr,
              value: 3000,
              unit: "sat",
            },
          ]);
          return bob.sendMax({ cashaddr: alice.cashaddr });
        },
        [process.env.ALICE_TESTNET_WALLET_ID]
      );
      expect(result.balance.sat).toBe(0);
    } else {
      expect.assertions(1);
      console.warn(
        "SKIPPING testnet maxAmountToSend test, set ALICE_TESTNET_ADDRESS env"
      );
    }
  });
});
