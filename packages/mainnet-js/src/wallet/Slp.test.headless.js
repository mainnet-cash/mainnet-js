const playwright = require("playwright");

const PAGE_URL = "http://localhost:8080";

describe.skip(`Wallet should function in the browser`, () => {
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

  let jestTokenId;

  test(`Should create slp token`, async () => {
    const result = await page.evaluate(async (wif) => {
      const wallet = await RegTestWallet.fromId(`wif:regtest:${wif}`);

      let ticker = Math.random().toString(36).substring(8).toUpperCase();

      const genesisOptions = {
        name: "Mainnet coin",
        ticker: ticker,
        decimals: 2,
        initialAmount: 10000,
        documentUrl: "https://mainnet.cash",
        documentHash:
          "0000000000000000000000000000000000000000000000000000000000000000",
      };

      const { tokenId } = await wallet.slp.genesis(genesisOptions);
      return tokenId;
    }, process.env.PRIVATE_WIF);
    expect(result.length).toBe(64);
    jestTokenId = result;
  });

  test(`Should mint extra slp tokens`, async () => {
    const result = await page.evaluate(
      async ([wif, tokenId]) => {
        const wallet = await RegTestWallet.fromId(`wif:regtest:${wif}`);

        const { balance } = await wallet.slp.mint({
          value: 10,
          tokenId: tokenId,
          endBaton: false,
        });
        return balance;
      },
      [process.env.PRIVATE_WIF, jestTokenId]
    );
    expect(result.value.c[0]).toBe(10010);
  });

  test(`Should send slp tokens`, async () => {
    const result = await page.evaluate(
      async ([wif, tokenId]) => {
        const wallet = await RegTestWallet.fromId(`wif:regtest:${wif}`);
        const bobWallet = await RegTestWallet.newRandom();

        const { balance } = await wallet.slp.send([
          { slpaddr: bobWallet.slp.slpaddr, value: 10, tokenId: tokenId },
        ]);
        return balance;
      },
      [process.env.PRIVATE_WIF, jestTokenId]
    );
    expect(result.value.c[0]).toBe(10000);
  });

  test.skip(`Should watch slp testnet balance`, async () => {
    jestTokenId =
      "132731d90ac4c88a79d55eae2ad92709b415de886329e958cf35fdd81ba34c15";
    const result = await page.evaluate(
      async ([wif, tokenId]) => {
        const wallet = await TestNetWallet.fromId(`wif:testnet:${wif}`);

        // // FIXME: we do not have gspp testnet yet
        // if (wallet.slp.provider instanceof GsppProvider) {
        //   console.warn("we do not have gspp testnet yet");
        // }

        const bobWallet = await TestNetWallet.newRandom();

        let balance;

        bobWallet.slp.watchBalance((_balance) => {
          balance = _balance;
        }, tokenId);

        await wallet.slp.send([
          { slpaddr: bobWallet.slp.slpaddr, value: 1, tokenId: tokenId },
        ]);

        await new Promise((resolve) => setTimeout(resolve, 10000));

        return balance;
      },
      [process.env.FAUCET_SLP_WIF, jestTokenId]
    );
    expect(result.value.c[0]).toBe(1);
  });
});
