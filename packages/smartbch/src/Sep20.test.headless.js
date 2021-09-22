const playwright = require("playwright");
const PAGE_URL = "http://localhost:8080/smartbch/index.html";
const assert = require("assert");

describe(`SmartBchWallet should function in the browser`, () => {
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
      waitUntil: "networkidle",
      timeout: 90000,
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  test("Test querying eth mainnet", async () => {
    await page.evaluate(async () => {
      const wallet = await SmartBchWallet.watchOnly(
        "0x227F0226499E308769478669669CbdCf4E7dA002"
      );
      wallet.setNetwork("EthMainnet");
      expect(
        (
          await wallet.sep20.getBalance(
            "0xdac17f958d2ee523a2206206994597c13d831ec7"
          )
        ).value.toNumber()
      ).toBeGreaterThanOrEqual(0);

      expect(
        (
          await wallet.sep20.getTokenInfo(
            "0xdac17f958d2ee523a2206206994597c13d831ec7"
          )
        ).totalSupply.toNumber()
      ).toBeGreaterThanOrEqual(0);
    });
  });

  test("Should fail to make a paid transaction from watch-only wallet", async () => {
    await expect(
      page.evaluate(async () => {
        const wallet = await SmartBchWallet.watchOnly(
          "0x227F0226499E308769478669669CbdCf4E7dA002"
        );
        wallet.setNetwork("EthMainnet");

        await wallet.sep20.send(
          [
            {
              address: wallet.getDepositAddress(),
              tokenId: "0xdac17f958d2ee523a2206206994597c13d831ec7",
              value: 3,
            },
          ],
          { gasPrice: 10 ** 10 }
        );
      })
    ).rejects.toThrow("sending a transaction requires a signer");
  });

  test("ERC20 genesis throws on watchOnly", async () => {
    await expect(
      page.evaluate(async () => {
        const watchWallet = await SmartBchWallet.watchOnly(
          "0x227F0226499E308769478669669CbdCf4E7dA002"
        );

        await watchWallet.sep20.genesis({ initialAmount: 0, decimals: 0 });
      })
    ).rejects.toThrow("Cannot deploy contracts with Watch-Only wallets");
  });

  test("ERC20 genesis and info", async () => {
    await expect(
      page.evaluate(async (SBCH_ALICE_ID) => {
        const options = {
          name: "Mainnet Coin",
          ticker: "MNC",
          decimals: 8,
          initialAmount: 10,
        };

        const alice = await RegTestSmartBchWallet.fromId(SBCH_ALICE_ID);

        const result = await alice.sep20.genesis(options, {
          gasPrice: 10 ** 10,
        });

        expect(result.balance.value).toStrictEqual(new BigNumber(10));
        expect(result.balance.name).toBe(options.name);
        expect(result.balance.ticker).toBe(options.ticker);
        expect(result.balance.decimals).toBe(options.decimals);
        expect(result.tokenId).toBe(result.balance.tokenId);

        // get token info
        const tokenInfo = await alice.sep20.getTokenInfo(result.tokenId);
        expect(tokenInfo.name).toBe(options.name);
        expect(tokenInfo.ticker).toBe(options.ticker);
        expect(tokenInfo.decimals).toBe(options.decimals);
        expect(tokenInfo.tokenId).toBe(result.tokenId);
        expect(tokenInfo.totalSupply).toStrictEqual(new BigNumber(10));

        // send
        const bob = await RegTestSmartBchWallet.fromPrivateKey(
          "0x17e40d4ce582a9f601e2a54d27c7268d6b7b4b865e1204bda15778795b017bff"
        );
        const sendResult = await alice.sep20.send(
          [
            {
              address: bob.getDepositAddress(),
              tokenId: result.tokenId,
              value: 3,
            },
          ],
          { gasPrice: 10 ** 10 }
        );

        expect(sendResult[0].balance.value).toStrictEqual(new BigNumber(7));
        expect(
          (await bob.sep20.getBalance(result.tokenId)).value
        ).toStrictEqual(new BigNumber(3));

        const charlie = await RegTestSmartBchWallet.newRandom();
        const dave = await RegTestSmartBchWallet.newRandom();
        const sendManyResult = await alice.sep20.send(
          [
            {
              address: charlie.getDepositAddress(),
              tokenId: result.tokenId,
              value: 1,
            },
            {
              address: dave.getDepositAddress(),
              tokenId: result.tokenId,
              value: 2,
            },
          ],
          { gasPrice: 10 ** 10 }
        );

        expect(
          (await alice.sep20.getBalance(result.tokenId)).value
        ).toStrictEqual(new BigNumber(4));
        expect(
          (await charlie.sep20.getBalance(result.tokenId)).value
        ).toStrictEqual(new BigNumber(1));
        expect(
          (await dave.sep20.getBalance(result.tokenId)).value
        ).toStrictEqual(new BigNumber(2));

        // sendMax
        const sendMaxResult = await bob.sep20.sendMax(
          alice.getDepositAddress(),
          result.tokenId,
          { gasPrice: 10 ** 10 }
        );
        expect(sendMaxResult.balance.value).toStrictEqual(new BigNumber(0));
        expect(
          (await alice.sep20.getBalance(result.tokenId)).value
        ).toStrictEqual(new BigNumber(7));
        expect(
          (await bob.sep20.getBalance(result.tokenId)).value
        ).toStrictEqual(new BigNumber(0));
      }, process.env.SBCH_ALICE_ID)
    ).rejects.toThrow("Contract deployment is not yet supported in browser");
  });

  test("ERC20 genesis with token receiver and baton receiver", async () => {
    await expect(
      page.evaluate(async (SBCH_ALICE_ID) => {
        const wallet = await RegTestSmartBchWallet.fromId(SBCH_ALICE_ID);

        const receiverWallet = await RegTestSmartBchWallet.fromPrivateKey(
          "0x17e40d4ce582a9f601e2a54d27c7268d6b7b4b865e1204bda15778795b017bff"
        );

        const options = {
          name: "Mainnet Coin",
          ticker: "MNC",
          decimals: 8,
          initialAmount: 10,
          tokenReceiverAddress: receiverWallet.getDepositAddress(),
          batonReceiverAddress: receiverWallet.getDepositAddress(),
        };

        const result = await wallet.sep20.genesis(options, {
          gasPrice: 10 ** 10,
        });

        expect(result.balance.value).toStrictEqual(new BigNumber(0));
        expect(result.balance.name).toBe(options.name);
        expect(result.balance.ticker).toBe(options.ticker);
        expect(result.balance.decimals).toBe(options.decimals);
        expect(result.tokenId).toBe(result.balance.tokenId);
        expect(
          (await wallet.sep20.getBalance(result.tokenId)).value
        ).toStrictEqual(new BigNumber(0));
        expect(
          (await receiverWallet.sep20.getBalance(result.tokenId)).value
        ).toStrictEqual(new BigNumber(10));

        // mint
        const mintResult = await receiverWallet.sep20.mint(
          {
            tokenId: result.tokenId,
            value: 5,
            tokenReceiverAddress: receiverWallet.getDepositAddress(),
          },
          { gasPrice: 10 ** 10, gasLimit: -1 }
        );
        expect(mintResult.balance.value).toStrictEqual(new BigNumber(15));

        // mint fail, no role
        await expect(
          wallet.sep20.mint(
            {
              tokenId: result.tokenId,
              value: 5,
              tokenReceiverAddress: wallet.getDepositAddress(),
            },
            { gasPrice: 10 ** 10, gasLimit: -1 }
          )
        ).rejects.toThrow(
          "is not allowed to mint or minting is not supported by the contract"
        );
      }, process.env.SBCH_ALICE_ID)
    ).rejects.toThrow("Contract deployment is not yet supported in browser");
  });

  test("ERC20 mint disabled (baton ended)", async () => {
    await expect(
      page.evaluate(async (SBCH_ALICE_ID) => {
        const wallet = await RegTestSmartBchWallet.fromId(SBCH_ALICE_ID);

        const options = {
          name: "Mainnet Coin",
          ticker: "MNC",
          decimals: 8,
          initialAmount: 10,
          endBaton: true,
        };

        const result = await wallet.sep20.genesis(options, {
          gasPrice: 10 ** 10,
        });

        expect(result.balance.value).toStrictEqual(new BigNumber(10));
        expect(result.balance.name).toBe(options.name);
        expect(result.balance.ticker).toBe(options.ticker);
        expect(result.balance.decimals).toBe(options.decimals);
        expect(result.tokenId).toBe(result.balance.tokenId);

        // mint fail, mint was disabled by genesis options
        await expect(
          wallet.sep20.mint(
            {
              tokenId: result.tokenId,
              value: 5,
              tokenReceiverAddress: wallet.getDepositAddress(),
            },
            { gasPrice: 10 ** 10, gasLimit: -1 }
          )
        ).rejects.toThrow(
          "is not allowed to mint or minting is not supported by the contract"
        );
      }, process.env.SBCH_ALICE_ID)
    ).rejects.toThrow("Contract deployment is not yet supported in browser");
  });
});
