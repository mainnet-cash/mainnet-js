const playwright = require("playwright");
const PAGE_URL = "http://localhost:8080";

describe(`Wallet should function in the browser`, () => {
  let browser;
  let page;

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

  test(`Test fungible cashtoken genesis and sending`, async () => {
    await page.evaluate(async (id) => {
      const alice = await RegTestWallet.fromId(id);
      const bob = await RegTestWallet.newRandom();
      const genesisResponse = await alice.tokenGenesis({
        amount: 100n,
      });

      const category = genesisResponse.categories[0];
      const tokenBalance = await alice.getTokenBalance(category);
      expect(tokenBalance).toBe(100n);
      const tokenUtxos = await alice.getTokenUtxos(category);
      expect(tokenUtxos.length).toBe(1);
      const response = await alice.send([
        new TokenSendRequest({
          cashaddr: bob.cashaddr,
          amount: 25n,
          category: category,
        }),
        new TokenSendRequest({
          cashaddr: alice.cashaddr,
          amount: 25n,
          category: category,
        }),
      ]);
      const newTokenUtxos = await alice.getTokenUtxos(category);
      expect(newTokenUtxos.length).toBe(2);
      expect(await alice.getTokenBalance(category)).toBe(75n);
      expect(await bob.getTokenBalance(category)).toBe(25n);
    }, process.env.ALICE_ID);
  });

  test(`Test NFT cashtoken genesis and sending`, async () => {
    await page.evaluate(async (id) => {
      const alice = await RegTestWallet.fromId(id);
      const bob = await RegTestWallet.newRandom();
      const genesisResponse = await alice.tokenGenesis({
        cashaddr: alice.cashaddr,
        nft: {
          capability: NFTCapability.mutable,
          commitment: "abcd",
        },
      });

      const category = genesisResponse.categories[0];
      const tokenBalance = await alice.getTokenBalance(category);
      expect(tokenBalance).toBe(0n);
      const tokenUtxos = await alice.getTokenUtxos(category);
      expect(tokenUtxos.length).toBe(1);
      const response = await alice.send([
        new TokenSendRequest({
          cashaddr: bob.cashaddr,
          category: category,
          nft: {
            capability: NFTCapability.mutable,
            commitment: "abcd",
          },
        }),
      ]);
      expect(await alice.getTokenBalance(category)).toBe(0n);
      const newTokenUtxos = await alice.getTokenUtxos(category);
      expect(newTokenUtxos.length).toBe(0);

      expect(await bob.getTokenBalance(category)).toBe(0n);
      const bobTokenUtxos = await bob.getTokenUtxos(category);
      expect(bobTokenUtxos.length).toBe(1);
      expect(category).toEqual(response.categories[0]);
      expect(bobTokenUtxos[0].token?.nft?.commitment).toEqual("abcd");
    }, process.env.ALICE_ID);
  });

  test("Test immutable NFT cashtoken genesis and sending, error on mutation", async () => {
    await page.evaluate(async (id) => {
      const alice = await RegTestWallet.fromId(id);
      const genesisResponse = await alice.tokenGenesis({
        cashaddr: alice.cashaddr,
        nft: {
          capability: NFTCapability.none,
          commitment: "abcd",
        },
      });

      const category = genesisResponse.categories[0];
      const tokenBalance = await alice.getTokenBalance(category);
      expect(tokenBalance).toBe(0n);
      const tokenUtxos = await alice.getTokenUtxos(category);
      expect(tokenUtxos.length).toBe(1);
      await expect(
        alice.send([
          new TokenSendRequest({
            cashaddr: alice.cashaddr,
            category: category,
            nft: {
              capability: NFTCapability.none,
              commitment: "abcd02",
            },
          }),
        ])
      ).rejects.toThrow("No suitable token utxos available to send token");
    }, process.env.ALICE_ID);
  });

  test("Test mutable NFT cashtoken genesis and mutation", async () => {
    await page.evaluate(async (id) => {
      const alice = await RegTestWallet.fromId(id);
      const genesisResponse = await alice.tokenGenesis({
        cashaddr: alice.cashaddr,
        nft: {
          capability: NFTCapability.mutable,
          commitment: "abcd",
        },
      });

      const category = genesisResponse.categories[0];
      const tokenBalance = await alice.getTokenBalance(category);
      expect(tokenBalance).toBe(0n);
      const tokenUtxos = await alice.getTokenUtxos(category);
      expect(tokenUtxos.length).toBe(1);
      const response = await alice.send([
        new TokenSendRequest({
          cashaddr: alice.cashaddr,
          category: category,
          nft: {
            capability: NFTCapability.mutable,
            commitment: "abcd02",
          },
        }),
      ]);
      expect(await alice.getTokenBalance(category)).toBe(0n);
      const newTokenUtxos = await alice.getTokenUtxos(category);
      expect(newTokenUtxos.length).toBe(1);
      expect(category).toEqual(response.categories[0]);
      expect(newTokenUtxos[0].token?.nft?.commitment).toEqual("abcd02");
    }, process.env.ALICE_ID);
  });

  test("Test minting NFT cashtoken genesis and minting", async () => {
    await page.evaluate(async (id) => {
      const alice = await RegTestWallet.fromId(id);
      const genesisResponse = await alice.tokenGenesis({
        cashaddr: alice.cashaddr,
        nft: {
          capability: NFTCapability.minting,
          commitment: "abcd",
        },
      });

      const category = genesisResponse.categories[0];
      const tokenBalance = await alice.getTokenBalance(category);
      expect(tokenBalance).toBe(0n);
      const tokenUtxos = await alice.getTokenUtxos(category);
      expect(tokenUtxos.length).toBe(1);
      const response = await alice.tokenMint(category, [
        new TokenMintRequest({
          cashaddr: alice.cashaddr,
          nft: {
            capability: NFTCapability.none,
            commitment: "test",
          },
        }),
        new TokenMintRequest({
          cashaddr: alice.cashaddr,
          nft: {
            capability: NFTCapability.none,
            commitment: "test2",
          },
        }),
      ]);
      expect(await alice.getTokenBalance(category)).toBe(0n);
      const newTokenUtxos = await alice.getTokenUtxos(category);
      expect(newTokenUtxos.length).toBe(3);
      expect(category).toEqual(response.categories[0]);
    }, process.env.ALICE_ID);
  });

  test("Test minting NFT and optionally burning FT cashtoken", async () => {
    await page.evaluate(async (id) => {
      const alice = await RegTestWallet.fromId(id);
      const genesisResponse = await alice.tokenGenesis({
        cashaddr: alice.cashaddr,
        amount: 4n,
        nft: {
          capability: NFTCapability.minting,
          commitment: "abcd",
        },
      });

      const category = genesisResponse.categories[0];
      const tokenBalance = await alice.getTokenBalance(category);
      expect(tokenBalance).toBe(4n);
      const tokenUtxos = await alice.getTokenUtxos(category);
      expect(tokenUtxos.length).toBe(1);

      // mint 2 NFTs, defaults to amount reducing
      const response = await alice.tokenMint(
        category,
        [
          new TokenMintRequest({
            cashaddr: alice.cashaddr,
            nft: {
              capability: NFTCapability.none,
              commitment: "0a",
            },
          }),
          new TokenMintRequest({
            cashaddr: alice.cashaddr,
            nft: {
              capability: NFTCapability.none,
              commitment: "0b",
            },
          }),
        ],
        true
      );
      expect(await alice.getTokenBalance(category)).toBe(2n);
      const newTokenUtxos = await alice.getTokenUtxos(category);
      expect(newTokenUtxos.length).toBe(3);
      expect(category).toEqual(response.categories[0]);

      // mint 2 more NFTs without amount reducing
      const ftResponse = await alice.tokenMint(
        category,
        [
          new TokenMintRequest({
            cashaddr: alice.cashaddr,
            nft: {
              capability: NFTCapability.none,
              commitment: "0c",
            },
          }),
          new TokenMintRequest({
            cashaddr: alice.cashaddr,
            nft: {
              capability: NFTCapability.none,
              commitment: "0d",
            },
          }),
        ],
        false
      );
      expect(await alice.getTokenBalance(category)).toBe(2n);
      const ftTokenUtxos = await alice.getTokenUtxos(category);
      expect(ftTokenUtxos.length).toBe(5);
      expect(category).toEqual(ftResponse.categories[0]);

      // we are going to hit amount -1, when minting 3 more NFTs
      // check that it will stop at 0
      const ft2Response = await alice.tokenMint(
        category,
        [
          new TokenMintRequest({
            cashaddr: alice.cashaddr,
            nft: {
              capability: NFTCapability.none,
              commitment: "0a",
            },
          }),
          new TokenMintRequest({
            cashaddr: alice.cashaddr,
            nft: {
              capability: NFTCapability.none,
              commitment: "0a",
            },
          }),
          new TokenMintRequest({
            cashaddr: alice.cashaddr,
            nft: {
              capability: NFTCapability.none,
              commitment: "0a",
            },
          }),
        ],
        true
      );
      expect(await alice.getTokenBalance(category)).toBe(0n);
      const ft2TokenUtxos = await alice.getTokenUtxos(category);
      expect(ft2TokenUtxos.length).toBe(8);
      expect(category).toEqual(ft2Response.categories[0]);
    }, process.env.ALICE_ID);
  });

  test("Test explicit burning of FT", async () => {
    await page.evaluate(async (id) => {
      const alice = await RegTestWallet.fromId(id);
      const genesisResponse = await alice.tokenGenesis({
        cashaddr: alice.cashaddr,
        amount: 4n,
      });

      const category = genesisResponse.categories[0];
      const tokenBalance = await alice.getTokenBalance(category);
      expect(tokenBalance).toBe(4n);
      const tokenUtxos = await alice.getTokenUtxos(category);
      expect(tokenUtxos.length).toBe(1);

      // burn 5 FT
      const response = await alice.tokenBurn(
        {
          category: category,
          amount: 5n,
        },
        "burn"
      );

      const rawTx = await alice.provider.getRawTransaction(response.txId, true);
      expect(rawTx.vout.length).toEqual(3);
      expect(rawTx.vout[0].scriptPubKey.type).toEqual("nulldata");
      expect(rawTx.vout[0].scriptPubKey.hex).toContain(
        binToHex(utf8ToBin("burn"))
      );
      expect(await alice.getTokenBalance(category)).toBe(0n);
      const newTokenUtxos = await alice.getTokenUtxos(category);
      expect(newTokenUtxos.length).toBe(0);
      expect(category).toEqual(response.categories[0]);
    }, process.env.ALICE_ID);
  });

  test("Test explicit burning of FT+NFT", async () => {
    await page.evaluate(async (id) => {
      const alice = await RegTestWallet.fromId(id);
      const genesisResponse = await alice.tokenGenesis({
        cashaddr: alice.cashaddr,
        amount: 4n,
        nft: {
          capability: NFTCapability.minting,
          commitment: "abcd",
        },
      });

      const category = genesisResponse.categories[0];
      const tokenBalance = await alice.getTokenBalance(category);
      expect(tokenBalance).toBe(4n);
      const tokenUtxos = await alice.getTokenUtxos(category);
      expect(tokenUtxos.length).toBe(1);

      // burn 1 FT
      const response = await alice.tokenBurn(
        {
          category: category,
          amount: 1n,
          nft: {
            capability: NFTCapability.minting,
            commitment: "abcd",
          },
        },
        "burn"
      );

      const rawTx = await alice.provider.getRawTransaction(response.txId, true);
      expect(rawTx.vout.length).toEqual(3);
      expect(rawTx.vout[0].scriptPubKey.type).toEqual("nulldata");
      expect(rawTx.vout[0].scriptPubKey.hex).toContain(
        binToHex(utf8ToBin("burn"))
      );
      expect(await alice.getTokenBalance(category)).toBe(3n);
      expect((await alice.getAllTokenBalances())[category]).toBe(3n);
      const newTokenUtxos = await alice.getTokenUtxos(category);
      expect(newTokenUtxos.length).toBe(1);
      expect(await alice.getNftTokenBalance(category)).toBe(1);
      expect((await alice.getAllNftTokenBalances())[category || 0]).toBe(1);
      expect(category).toEqual(response.categories[0]);

      // burn the rest FTs
      const ftResponse = await alice.tokenBurn(
        {
          category: category,
          amount: 5n,
          nft: {
            capability: NFTCapability.minting,
            commitment: "abcd",
          },
        },
        "burn"
      );
      expect(await alice.getTokenBalance(category)).toBe(0n);
      const ftTokenUtxos = await alice.getTokenUtxos(category);
      expect(ftTokenUtxos.length).toBe(1);
      expect(category).toEqual(ftResponse.categories[0]);

      // burn the NFT too
      const nftResponse = await alice.tokenBurn(
        {
          category: category,
          nft: {
            capability: NFTCapability.minting,
            commitment: "abcd",
          },
        },
        "burn"
      );
      expect(await alice.getTokenBalance(category)).toBe(0n);
      expect((await alice.getAllTokenBalances())[category] || 0n).toBe(0n);
      const nftTokenUtxos = await alice.getTokenUtxos(category);
      expect(nftTokenUtxos.length).toBe(0);
      expect(category).toEqual(nftResponse.categories[0]);
      expect(await alice.getNftTokenBalance(category)).toBe(0);
      expect((await alice.getAllNftTokenBalances())[category] || 0n).toBe(0n);
    }, process.env.ALICE_ID);
  });

  test("Test cashtoken satoshi values and fee calculations", async () => {
    await page.evaluate(async (id) => {
      const alice = await RegTestWallet.fromId(id);
      const bob = await RegTestWallet.newRandom();
      const genesisResponse = await alice.tokenGenesis({
        amount: 100,
        value: 7000n,
        cashaddr: bob.cashaddr,
      });

      const category = genesisResponse.categories[0];
      const tokenBalance = await bob.getTokenBalance(category);
      expect(tokenBalance).toBe(100n);
      const tokenUtxos = await bob.getTokenUtxos(category);
      expect(tokenUtxos.length).toBe(1);
      expect(tokenUtxos[0].satoshis).toBe(7000n);

      // lower the token satoshi value
      const response = await bob.send([
        new TokenSendRequest({
          cashaddr: bob.cashaddr,
          amount: 100,
          category: category,
          value: 1500n,
        }),
      ]);
      let newTokenUtxos = await bob.getTokenUtxos(category);
      expect(newTokenUtxos.length).toBe(1);
      expect(await bob.getTokenBalance(category)).toBe(100n);

      let bobUtxos = await bob.getUtxos();
      expect(bobUtxos.length).toBe(2);
      expect(bobUtxos[0].satoshis).toBe(1500n);
      expect(bobUtxos[1].satoshis).toBe(5245n);

      // raise the token satoshi value
      await bob.send([
        new TokenSendRequest({
          cashaddr: bob.cashaddr,
          amount: 100,
          category: category,
          value: 3000n,
        }),
      ]);
      newTokenUtxos = await bob.getTokenUtxos(category);
      expect(newTokenUtxos.length).toBe(1);
      expect(await bob.getTokenBalance(category)).toBe(100n);

      bobUtxos = await bob.getUtxos();
      expect(bobUtxos.length).toBe(2);
      expect(bobUtxos[0].satoshis).toBe(3000n);
      expect(bobUtxos[1].satoshis).toBe(3349n);
    }, process.env.ALICE_ID);
  });

  test("Test cashtoken waiting and watching balance", async () => {
    await page.evaluate(async (id) => {
      const alice = await RegTestWallet.fromId(id);
      const bob = await RegTestWallet.newRandom();

      const genesisResponse = await alice.tokenGenesis({
        amount: 100,
        value: 5000n,
        nft: {
          capability: NFTCapability.minting,
          commitment: "test",
        },
        cashaddr: alice.cashaddr,
      });

      const category = genesisResponse.categories[0];
      const tokenBalance = await alice.getTokenBalance(category);
      expect(tokenBalance).toBe(100n);
      const tokenUtxos = await alice.getTokenUtxos(category);
      expect(tokenUtxos.length).toBe(1);
      expect(tokenUtxos[0].satoshis).toBe(5000n);

      let seenBalance = 0;
      setTimeout(
        () =>
          alice.send([
            new TokenSendRequest({
              cashaddr: bob.cashaddr,
              amount: 100,
              category: category,
              value: 1500n,
              nft: {
                capability: NFTCapability.minting,
                commitment: "test",
              },
            }),
          ]),
        0
      );

      const cancel = await bob.watchTokenBalance(category, (balance) => {
        seenBalance = balance;
      });

      const [balance, _] = await Promise.all([
        bob.waitForTokenBalance(category, 100),
        delay(1000),
      ]);

      expect(balance).toBe(100n);
      expect(seenBalance).toBe(100n);

      await Promise.all([cancel(), delay(1000)]);
    }, process.env.ALICE_ID);
  });

  test("Should encode unsigned transactions", async () => {
    await page.evaluate(async (id) => {
      const binsAreEqual = (a, b) => {
        if (a.length !== b.length) {
          return false;
        }
        // eslint-disable-next-line functional/no-let, functional/no-loop-statement, no-plusplus
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) {
            return false;
          }
        }
        return true;
      };

      BigInt.prototype.toJSON = function () {
        const int = Number.parseInt(this.toString());
        return int ?? this.toString();
      };

      const aliceWallet = await RegTestWallet.fromId(id);
      const aliceWatchWallet = await RegTestWallet.watchOnly(
        aliceWallet.cashaddr
      );

      let category;
      {
        const aliceUtxos = await aliceWallet.getUtxos();

        const { unsignedTransaction, sourceOutputs, categories } =
          await aliceWatchWallet.tokenGenesis(
            {
              nft: {
                capability: "minting",
                commitment: "00",
              },
            },
            undefined,
            { buildUnsigned: true }
          );
        const encodedTransaction = hexToBin(unsignedTransaction);
        expect(encodedTransaction.length).toBeGreaterThan(0);

        // check transaction was not submitted
        expect(JSON.stringify(aliceUtxos)).toBe(
          JSON.stringify(await aliceWallet.getUtxos())
        );

        const decoded = libauth.decodeTransaction(encodedTransaction);
        if (typeof decoded === "string") {
          throw decoded;
        }

        expect(
          binsAreEqual(decoded.inputs[0].unlockingBytecode, Uint8Array.from([]))
        ).toBe(true);
        expect(sourceOutputs.length).toBe(decoded.inputs.length);
        expect(binToHex(decoded.outputs[0].token?.nft?.commitment)).toBe("00");

        const signed = await aliceWallet.signUnsignedTransaction(
          unsignedTransaction,
          sourceOutputs
        );
        await aliceWallet.submitTransaction(signed);

        category = categories[0];

        expect(await aliceWallet.getNftTokenBalance(category)).toBe(1);
        const tokenUtxos = await aliceWallet.getTokenUtxos(category);
        expect(tokenUtxos.length).toBe(1);
        expect(tokenUtxos[0].token?.nft?.capability).toBe(
          NFTCapability.minting
        );
      }

      {
        const aliceUtxos = await aliceWallet.getUtxos();

        const { unsignedTransaction, sourceOutputs } =
          await aliceWatchWallet.tokenMint(
            category,
            {
              nft: {
                capability: "none",
                commitment: "0a",
              },
            },
            undefined,
            { buildUnsigned: true }
          );
        const encodedTransaction = hexToBin(unsignedTransaction);
        expect(encodedTransaction.length).toBeGreaterThan(0);

        // check transaction was not submitted
        expect(JSON.stringify(aliceUtxos)).toBe(
          JSON.stringify(await aliceWallet.getUtxos())
        );

        const decoded = libauth.decodeTransaction(encodedTransaction);
        if (typeof decoded === "string") {
          throw decoded;
        }

        expect(
          binsAreEqual(decoded.inputs[0].unlockingBytecode, Uint8Array.from([]))
        ).toBe(true);
        expect(sourceOutputs.length).toBe(decoded.inputs.length);
        expect(binToHex(sourceOutputs[0].token?.nft?.commitment)).toBe("00");
        expect(binToHex(decoded.outputs[0].token?.nft?.commitment)).toBe("00");
        expect(binToHex(decoded.outputs[1].token?.nft?.commitment)).toBe("0a");

        const signed = await aliceWallet.signUnsignedTransaction(
          unsignedTransaction,
          sourceOutputs
        );
        await aliceWallet.submitTransaction(signed);

        expect(await aliceWallet.getNftTokenBalance(category)).toBe(2);
        const tokenUtxos = await aliceWallet.getTokenUtxos(category);
        expect(tokenUtxos.length).toBe(2);
        expect(
          tokenUtxos.filter(
            (val) => val.token?.nft?.capability === NFTCapability.minting
          ).length
        ).toBe(1);
        expect(
          tokenUtxos.filter(
            (val) => val.token?.nft?.capability === NFTCapability.none
          ).length
        ).toBe(1);
      }

      {
        const aliceUtxos = await aliceWallet.getUtxos();

        const { unsignedTransaction, sourceOutputs } =
          await aliceWatchWallet.send(
            [
              new TokenSendRequest({
                category: category,
                nft: {
                  capability: "none",
                  commitment: "0a",
                },
                cashaddr: aliceWallet.cashaddr,
              }),
            ],
            { buildUnsigned: true }
          );
        const encodedTransaction = hexToBin(unsignedTransaction);
        expect(encodedTransaction.length).toBeGreaterThan(0);

        // check transaction was not submitted
        expect(JSON.stringify(aliceUtxos)).toBe(
          JSON.stringify(await aliceWallet.getUtxos())
        );

        const decoded = libauth.decodeTransaction(encodedTransaction);
        if (typeof decoded === "string") {
          throw decoded;
        }

        expect(
          binsAreEqual(decoded.inputs[0].unlockingBytecode, Uint8Array.from([]))
        ).toBe(true);
        expect(sourceOutputs.length).toBe(decoded.inputs.length);
        expect(binToHex(sourceOutputs[0].token?.nft?.commitment)).toBe("0a");
        expect(binToHex(decoded.outputs[0].token?.nft?.commitment)).toBe("0a");

        const signed = await aliceWallet.signUnsignedTransaction(
          unsignedTransaction,
          sourceOutputs
        );
        await aliceWallet.submitTransaction(signed);
        expect(await aliceWallet.getNftTokenBalance(category)).toBe(2);
        const tokenUtxos = await aliceWallet.getTokenUtxos(category);
        expect(tokenUtxos.length).toBe(2);
        expect(
          tokenUtxos.filter(
            (val) => val.token?.nft?.capability === NFTCapability.minting
          ).length
        ).toBe(1);
        expect(
          tokenUtxos.filter(
            (val) => val.token?.nft?.capability === NFTCapability.none
          ).length
        ).toBe(1);
      }
    }, process.env.ALICE_ID);
  });
});
