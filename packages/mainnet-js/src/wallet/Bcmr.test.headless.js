const playwright = require("playwright");
const PAGE_URL = "http://localhost:8080";

describe(`Wallet should function in the browser`, () => {
  let browser;
  let page;

  const registry = {
    $schema: "https://cashtokens.org/bcmr-v2.schema.json",
    version: {
      major: 0,
      minor: 1,
      patch: 0,
    },
    latestRevision: "2023-01-26T18:51:35.115Z",
    registryIdentity: {
      name: "example bcmr",
      description: "example bcmr for tokens on chipnet",
    },
    identities: {
      "0000000000000000000000000000000000000000000000000000000000000000": {
        "2023-01-26T18:51:35.115Z": {
          name: "test tokens",
          description: "",
          uris: {
            icon: "https://example.com/nft",
          },
          token: {
            category:
              "0000000000000000000000000000000000000000000000000000000000000000",
            symbol: "TOK",
            decimals: 8,
            nfts: {
              description: "",
              parse: {
                bytecode: "00d2",
                types: {
                  "00": {
                    name: "NFT Item 0",
                    description: "NFT Item 0 in the collection",
                    uris: {
                      icon: "https://example.com/nft/00.jpg",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    extensions: {},
  };

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

  test("Add metadata registry and get token info", async () => {
    await page.evaluate(
      async ([id, registry]) => {
        expect(
          BCMR.getTokenInfo(
            "0000000000000000000000000000000000000000000000000000000000000000"
          )
        ).toBe(undefined);
        BCMR.addMetadataRegistry(registry);
        const tokenInfo = BCMR.getTokenInfo(
          "0000000000000000000000000000000000000000000000000000000000000000"
        );
        expect(tokenInfo?.token?.symbol).toBe("TOK");
        expect(tokenInfo?.token?.decimals).toBe(8);

        // check adding the same registry does not produce a duplicate
        expect(BCMR.metadataRegistries.length).toBe(1);
        BCMR.addMetadataRegistry(registry);
        expect(BCMR.metadataRegistries.length).toBe(1);
      },
      [process.env.ALICE_ID, registry]
    );
  });

  test(`Add metadata from uri and get token info`, async () => {
    await page.evaluate(
      async ([id, registry]) => {
        BCMR.resetRegistries();

        setupAxiosMock(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
          registry
        );

        expect(
          BCMR.getTokenInfo(
            "0000000000000000000000000000000000000000000000000000000000000000"
          )
        ).toBe(undefined);
        await BCMR.addMetadataRegistryFromUri(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
        );
        const tokenInfo = BCMR.getTokenInfo(
          "0000000000000000000000000000000000000000000000000000000000000000"
        );
        expect(tokenInfo?.token?.symbol).toBe("TOK");
        expect(tokenInfo?.token?.decimals).toBe(8);

        // check adding the same registry does not produce a duplicate
        expect(BCMR.metadataRegistries.length).toBe(1);
        await BCMR.addMetadataRegistryFromUri(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
        );
        expect(BCMR.metadataRegistries.length).toBe(1);

        removeAxiosMock(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
        );
      },
      [process.env.ALICE_ID, registry]
    );
  });

  test("Auth chain with 1 element, add resolved registry", async () => {
    await page.evaluate(
      async ([id, registry]) => {
        BCMR.resetRegistries();

        const alice = await RegTestWallet.fromId(id);
        const bob = await RegTestWallet.newRandom();

        const registryContent = JSON.stringify(registry, null, 2);
        const registryContentHashBin = sha256.hash(utf8ToBin(registryContent));
        const registryContentHashBinBitcoinByteOrder = registryContentHashBin;

        let chunks = [
          "BCMR",
          registryContentHashBinBitcoinByteOrder,
          "mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
        ];
        const opreturnData = OpReturnData.fromArray(chunks);
        const response = await alice.send([
          new SendRequest({
            cashaddr: bob.cashaddr,
            value: 10000,
            unit: "sat",
          }),
          opreturnData,
        ]);

        setupAxiosMock(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
          registry
        );

        expect(
          BCMR.getTokenInfo(
            "0000000000000000000000000000000000000000000000000000000000000000"
          )
        ).toBe(undefined);
        const chain = await BCMR.addMetadataRegistryAuthChain({
          transactionHash: response.txId,
          network: Network.REGTEST,
        });
        expect(chain.length).toBe(1);
        expect(chain[0].txHash).toBe(response.txId);
        expect(chain[0].uris[0]).toBe(
          "mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
        );

        const tokenInfo = BCMR.getTokenInfo(
          "0000000000000000000000000000000000000000000000000000000000000000"
        );
        expect(tokenInfo?.token?.symbol).toBe("TOK");
        expect(tokenInfo?.token?.decimals).toBe(8);

        // check adding the same registry does not produce a duplicate
        expect(BCMR.metadataRegistries.length).toBe(1);
        const otherChain = await BCMR.addMetadataRegistryAuthChain({
          transactionHash: response.txId,
          network: Network.REGTEST,
        });
        expect(otherChain.length).toBe(1);
        expect(BCMR.metadataRegistries.length).toBe(1);

        removeAxiosMock(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
        );
      },
      [process.env.ALICE_ID, registry]
    );
  });

  test("Authchain tail resolution info in registry acceleration path", async () => {
    await page.evaluate(
      async ([id, registry]) => {
        BCMR.resetRegistries();

        const alice = await RegTestWallet.fromId(id);
        const bob = await RegTestWallet.newRandom();

        const registry_v1 = { ...registry };
        registry_v1.extensions = { authchain: {} };
        const contentHash_v1 = sha256.hash(
          utf8ToBin(JSON.stringify(registry_v1, null, 2))
        );
        setupAxiosMock(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v1.json",
          JSON.stringify(registry_v1, null, 2)
        );
        let chunks = [
          "BCMR",
          contentHash_v1,
          "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v1.json",
        ];
        const opreturnData = OpReturnData.fromArray(chunks);
        const response = await alice.send([
          new SendRequest({
            cashaddr: bob.cashaddr,
            value: 10000,
            unit: "sat",
          }),
          opreturnData,
        ]);

        const registry_v2 = { ...registry };
        registry_v2.extensions = {
          authchain: { 0: await bob.provider.getRawTransaction(response.txId) },
        };
        const contentHash_v2 = sha256.hash(
          utf8ToBin(JSON.stringify(registry_v2, null, 2))
        );
        setupAxiosMock(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json",
          JSON.stringify(registry_v2, null, 2)
        );
        chunks = [
          "BCMR",
          contentHash_v2,
          "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json",
        ];
        const opreturnData2 = OpReturnData.fromArray(chunks);
        const response2 = await bob.send([
          new SendRequest({ cashaddr: bob.cashaddr, value: 9500, unit: "sat" }),
          opreturnData2,
        ]);

        const registry_v3 = { ...registry };
        registry_v3.extensions = {
          authchain: {
            0: await bob.provider.getRawTransaction(response.txId),
            1: await bob.provider.getRawTransaction(response2.txId),
          },
        };
        const contentHash_v3 = sha256.hash(
          utf8ToBin(JSON.stringify(registry_v3, null, 2))
        );
        setupAxiosMock(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json",
          JSON.stringify(registry_v3, null, 2)
        );
        chunks = [
          "BCMR",
          contentHash_v3,
          "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json",
        ];
        const opreturnData3 = OpReturnData.fromArray(chunks);
        const response3 = await bob.send([
          new SendRequest({ cashaddr: bob.cashaddr, value: 9000, unit: "sat" }),
          opreturnData3,
        ]);

        const registry_v4 = { ...registry };
        registry_v4.extensions = {};
        const contentHash_v4 = sha256.hash(
          utf8ToBin(JSON.stringify(registry_v4, null, 2))
        );
        setupAxiosMock(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v4.json",
          JSON.stringify(registry_v4, null, 2)
        );
        chunks = [
          "BCMR",
          contentHash_v4,
          "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v4.json",
        ];
        const opreturnData4 = OpReturnData.fromArray(chunks);
        const response4 = await bob.send([
          new SendRequest({ cashaddr: bob.cashaddr, value: 8500, unit: "sat" }),
          opreturnData4,
        ]);

        let chain = await BCMR.buildAuthChain({
          transactionHash: response.txId,
          network: Network.REGTEST,
        });
        expect(chain.length).toBe(4);

        chain = await BCMR.buildAuthChain({
          transactionHash: response.txId,
          network: Network.REGTEST,
          followToHead: false,
        });
        expect(chain.length).toBe(1);

        // tail acceleration available, do not follow head
        chain = await BCMR.buildAuthChain({
          transactionHash: response3.txId,
          network: Network.REGTEST,
          followToHead: false,
          resolveBase: true,
        });
        expect(chain.length).toBe(3);

        // resolve single element
        chain = await BCMR.buildAuthChain({
          transactionHash: response3.txId,
          network: Network.REGTEST,
          followToHead: false,
          resolveBase: false,
        });
        expect(chain.length).toBe(1);

        // no acceleration available, will scan network
        chain = await BCMR.buildAuthChain({
          transactionHash: response4.txId,
          network: Network.REGTEST,
          resolveBase: true,
        });
        expect(chain.length).toBe(4);

        expect(chain[0].txHash).toBe(response.txId);
        expect(chain[0].uris[0]).toBe(
          "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v1.json"
        );
        expect(chain[0].httpsUrl).toBe(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v1.json"
        );

        expect(chain[1].txHash).toBe(response2.txId);
        expect(chain[1].uris[0]).toBe(
          "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
        );
        expect(chain[1].httpsUrl).toBe(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
        );

        expect(chain[2].txHash).toBe(response3.txId);
        expect(chain[2].uris[0]).toBe(
          "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json"
        );
        expect(chain[2].httpsUrl).toBe(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json"
        );

        expect(chain[3].txHash).toBe(response4.txId);
        expect(chain[3].uris[0]).toBe(
          "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v4.json"
        );
        expect(chain[3].httpsUrl).toBe(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v4.json"
        );

        removeAxiosMock(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v1.json"
        );
        removeAxiosMock(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
        );
        removeAxiosMock(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json"
        );
        removeAxiosMock(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v4.json"
        );
      },
      [process.env.ALICE_ID, registry]
    );
  });

  test("Auth chain: BCMR, ipfs hash", async () => {
    await page.evaluate(
      async ([id, registry]) => {
        const alice = await RegTestWallet.fromId(id);
        const bob = await RegTestWallet.newRandom();

        const chunks = [
          "BCMR",
          "QmbWrG5Asp5iGmUwQHogSJGRX26zuRnuLWPytZfiL75sZv",
        ];
        const opreturnData = OpReturnData.fromArray(chunks);

        const response = await alice.send([
          new SendRequest({ cashaddr: bob.cashaddr, value: 1000, unit: "sat" }),
          opreturnData,
        ]);
        const chain = await BCMR.buildAuthChain({
          transactionHash: response.txId,
          network: Network.REGTEST,
        });
        expect(chain.length).toBe(1);
        expect(chain[0].contentHash).toBe(
          "516d62577247354173703569476d557751486f67534a47525832367a75526e754c575079745a66694c3735735a76"
        );
        expect(chain[0].uris[0]).toBe(
          "ipfs://QmbWrG5Asp5iGmUwQHogSJGRX26zuRnuLWPytZfiL75sZv"
        );
        expect(chain[0].httpsUrl).toBe(
          "https://dweb.link/ipfs/QmbWrG5Asp5iGmUwQHogSJGRX26zuRnuLWPytZfiL75sZv"
        );
        expect(chain[0].txHash).toBe(response.txId);
      },
      [process.env.ALICE_ID, registry]
    );
  });

  test("Auth chain: BCMR, sha256 content hash, 2 uris", async () => {
    await page.evaluate(
      async ([id, registry]) => {
        const alice = await RegTestWallet.fromId(id);
        const bob = await RegTestWallet.newRandom();

        const chunks = [
          "BCMR",
          sha256.hash(utf8ToBin("registry_contents")),
          "mainnet.cash",
          "ipfs://QmbWrG5Asp5iGmUwQHogSJGRX26zuRnuLWPytZfiL75sZv",
        ];
        const opreturnData = OpReturnData.fromArray(chunks);
        const response = await alice.send([
          new SendRequest({ cashaddr: bob.cashaddr, value: 1000, unit: "sat" }),
          opreturnData,
        ]);
        const chain = await BCMR.buildAuthChain({
          transactionHash: response.txId,
          network: Network.REGTEST,
        });

        expect(chain.length).toBe(1);
        expect(chain[0].uris.length).toBe(2);
        expect(chain[0].uris[0]).toBe("mainnet.cash");
        expect(chain[0].uris[1]).toBe(
          "ipfs://QmbWrG5Asp5iGmUwQHogSJGRX26zuRnuLWPytZfiL75sZv"
        );
        expect(chain[0].httpsUrl).toBe(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
        );
      },
      [process.env.ALICE_ID, registry]
    );
  });
});
