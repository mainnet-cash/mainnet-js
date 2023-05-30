import { disconnectProviders, initProviders } from "../network/Connection.js";
import { setupAxiosMock, removeAxiosMock } from "../test/axios.js";
import { AuthChain, BCMR } from "./Bcmr.js";
import { Registry } from "./bcmr-v2.schema.js";
import { RegTestWallet, Wallet } from "./Wif";
import { OpReturnData, SendRequest, TokenSendRequest } from "./model";
import {
  binToHex,
  binToNumberUint16LE,
  hexToBin,
  numberToBinUint16LE,
  sha256,
  utf8ToBin,
} from "@bitauth/libauth";
import { mine } from "../mine";
import { NFTCapability, Network } from "../interface";
import ElectrumNetworkProvider from "../network/ElectrumNetworkProvider.js";

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});
afterEach(async () => {
  BCMR.resetRegistries();
});

describe(`Test BCMR support`, () => {
  const registry: Registry = {
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
  };

  const registryContent = JSON.stringify(registry, null, 2);
  const registryContentHashBin = sha256.hash(utf8ToBin(registryContent));
  const registryContentHash = binToHex(registryContentHashBin);
  const registryContentHashBinBitcoinByteOrder = registryContentHashBin;

  test("Add metadata registry and get token info", async () => {
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

    expect(
      BCMR.getTokenInfo(
        "1111111111111111111111111111111111111111111111111111111111111111"
      )
    ).toBe(undefined);
  });

  test("Add metadata from uri and get token info", async () => {
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
  });

  test("Add metadata from uri with contenthash and get token info", async () => {
    setupAxiosMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
      registryContent
    );

    expect(
      BCMR.getTokenInfo(
        "0000000000000000000000000000000000000000000000000000000000000000"
      )
    ).toBe(undefined);
    await expect(
      BCMR.addMetadataRegistryFromUri(
        "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
        "00"
      )
    ).rejects.toThrow("mismatch");
    await BCMR.addMetadataRegistryFromUri(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
      registryContentHash
    );
    const tokenInfo = BCMR.getTokenInfo(
      "0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(tokenInfo?.token?.symbol).toBe("TOK");
    expect(tokenInfo?.token?.decimals).toBe(8);

    removeAxiosMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
  });

  test("Auth chain: invalid transaction", async () => {
    await expect(
      BCMR.buildAuthChain({
        transactionHash:
          "0000000000000000000000000000000000000000000000000000000000000000",
      })
    ).rejects.toThrow("Could not decode transaction");
  });

  test("Auth chain: no BCMR", async () => {
    const alice = await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF!}`
    );
    const bob = await RegTestWallet.newRandom();

    const chunks = ["Hello"];
    const opreturnData = OpReturnData.fromArray(chunks);

    const response = await alice.send([
      new SendRequest({ cashaddr: bob.cashaddr!, value: 1000, unit: "sat" }),
      opreturnData,
    ]);
    const authChain = await BCMR.buildAuthChain({
      transactionHash: response.txId!,
      network: Network.REGTEST,
    });
    expect(authChain.length).toBe(0);
  });

  test("Auth chain: BCMR, no hash", async () => {
    const alice = await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF!}`
    );
    const bob = await RegTestWallet.newRandom();

    const chunks = ["BCMR"];
    const opreturnData = OpReturnData.fromArray(chunks);

    const response = await alice.send([
      new SendRequest({ cashaddr: bob.cashaddr!, value: 1000, unit: "sat" }),
      opreturnData,
    ]);
    await expect(
      BCMR.buildAuthChain({
        transactionHash: response.txId!,
        network: Network.REGTEST,
      })
    ).rejects.toThrow("Malformed BCMR output");
  });

  test("Auth chain: BCMR, ipfs hash", async () => {
    const alice = await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF!}`
    );
    const bob = await RegTestWallet.newRandom();

    const chunks = ["BCMR", "QmbWrG5Asp5iGmUwQHogSJGRX26zuRnuLWPytZfiL75sZv"];
    const opreturnData = OpReturnData.fromArray(chunks);

    const response = await alice.send([
      new SendRequest({ cashaddr: bob.cashaddr!, value: 1000, unit: "sat" }),
      opreturnData,
    ]);
    const chain = await BCMR.buildAuthChain({
      transactionHash: response.txId!,
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
  });

  test("Auth chain: BCMR, ipfs hash and uri", async () => {
    const alice = await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF!}`
    );
    const bob = await RegTestWallet.newRandom();

    const chunks = [
      "BCMR",
      sha256.hash(utf8ToBin("registry_contents")),
      "ipfs://bafkreiejafiz23ewtyh6m3dpincmxouohdcimrd33abacrq3h2pacewwjm",
    ];
    const opreturnData = OpReturnData.fromArray(chunks);

    const response = await alice.send([
      new SendRequest({ cashaddr: bob.cashaddr!, value: 1000, unit: "sat" }),
      opreturnData,
    ]);
    const chain = await BCMR.buildAuthChain({
      transactionHash: response.txId!,
      network: Network.REGTEST,
    });
    expect(chain.length).toBe(1);
    expect(chain[0].contentHash).toBe(
      "e073b89a80c77c533ad364692db15df01adb9df404592f608d2c0cdd8960ed0e"
    );
    expect(chain[0].uris[0]).toBe(
      "ipfs://bafkreiejafiz23ewtyh6m3dpincmxouohdcimrd33abacrq3h2pacewwjm"
    );
    expect(chain[0].httpsUrl).toBe(
      "https://dweb.link/ipfs/bafkreiejafiz23ewtyh6m3dpincmxouohdcimrd33abacrq3h2pacewwjm"
    );
    expect(chain[0].txHash).toBe(response.txId);
  });

  test("Auth chain: BCMR, ipfs https url", async () => {
    const alice = await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF!}`
    );
    const bob = await RegTestWallet.newRandom();

    const chunks = [
      "BCMR",
      sha256.hash(utf8ToBin("registry_contents")),
      "bafkreiejafiz23ewtyh6m3dpincmxouohdcimrd33abacrq3h2pacewwjm.ipfs.dweb.link",
    ];
    const opreturnData = OpReturnData.fromArray(chunks);

    const response = await alice.send([
      new SendRequest({ cashaddr: bob.cashaddr!, value: 1000, unit: "sat" }),
      opreturnData,
    ]);
    const chain = await BCMR.buildAuthChain({
      transactionHash: response.txId!,
      network: Network.REGTEST,
    });
    expect(chain.length).toBe(1);
    expect(chain[0].contentHash).toBe(
      "e073b89a80c77c533ad364692db15df01adb9df404592f608d2c0cdd8960ed0e"
    );
    expect(chain[0].uris[0]).toBe(
      "bafkreiejafiz23ewtyh6m3dpincmxouohdcimrd33abacrq3h2pacewwjm.ipfs.dweb.link"
    );
    expect(chain[0].httpsUrl).toBe(
      "https://bafkreiejafiz23ewtyh6m3dpincmxouohdcimrd33abacrq3h2pacewwjm.ipfs.dweb.link"
    );
    expect(chain[0].txHash).toBe(response.txId);
  });

  test("Auth chain: BCMR, sha256 content hash, uri", async () => {
    const alice = await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF!}`
    );
    const bob = await RegTestWallet.newRandom();

    const contentHashBin = sha256.hash(utf8ToBin("registry_contents"));
    const chunks = ["BCMR", contentHashBin, "mainnet.cash"];
    const opreturnData = OpReturnData.fromArray(chunks);

    const response = await alice.send([
      new SendRequest({ cashaddr: bob.cashaddr!, value: 1000, unit: "sat" }),
      opreturnData,
    ]);
    const chain = await BCMR.buildAuthChain({
      transactionHash: response.txId!,
      network: Network.REGTEST,
    });
    expect(chain.length).toBe(1);
    expect(chain[0].contentHash).toBe(binToHex(contentHashBin));
    expect(chain[0].uris[0]).toBe("mainnet.cash");
    expect(chain[0].httpsUrl).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
    expect(chain[0].txHash).toBe(response.txId);
  });

  test("Auth chain: BCMR, sha256 content hash, 2 uris", async () => {
    const alice = await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF!}`
    );
    const bob = await RegTestWallet.newRandom();

    const chunks = [
      "BCMR",
      sha256.hash(utf8ToBin("registry_contents")),
      "mainnet.cash",
      "ipfs://QmbWrG5Asp5iGmUwQHogSJGRX26zuRnuLWPytZfiL75sZv",
    ];
    const opreturnData = OpReturnData.fromArray(chunks);
    const response = await alice.send([
      new SendRequest({ cashaddr: bob.cashaddr!, value: 1000, unit: "sat" }),
      opreturnData,
    ]);
    const chain = await BCMR.buildAuthChain({
      transactionHash: response.txId!,
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
  });

  test("Auth chain: all OP_PUSDHDATA encodings", async () => {
    const alice = await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF!}`
    );
    const bob = await RegTestWallet.newRandom();

    const opreturnData = OpReturnData.fromUint8Array(
      hexToBin(
        "6a0442434d524c20e073b89a80c77c533ad364692db15df01adb9df404592f608d2c0cdd8960ed0e4d440068747470733a2f2f6d61696e6e65742e636173682f2e77656c6c2d6b6e6f776e2f626974636f696e2d636173682d6d657461646174612d72656769737472792e6a736f6e"
      )
    );
    const response = await alice.send([
      new SendRequest({ cashaddr: bob.cashaddr!, value: 1000, unit: "sat" }),
      opreturnData,
    ]);
    await BCMR.buildAuthChain({
      transactionHash: response.txId!,
      network: Network.REGTEST,
    });
  });

  test("Auth chain with 1 element, add resolved registry", async () => {
    const alice = await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF!}`
    );
    const bob = await RegTestWallet.newRandom();

    let chunks = [
      "BCMR",
      registryContentHashBinBitcoinByteOrder,
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
    ];
    const opreturnData = OpReturnData.fromArray(chunks);
    const response = await alice.send([
      new SendRequest({ cashaddr: bob.cashaddr!, value: 10000, unit: "sat" }),
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
      transactionHash: response.txId!,
      network: Network.REGTEST,
    });
    expect(chain.length).toBe(1);
    expect(chain[0].txHash).toBe(response.txId!);
    expect(chain[0].uris[0]).toBe(
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
    expect(chain[0].httpsUrl).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );

    const tokenInfo = BCMR.getTokenInfo(
      "0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(tokenInfo?.token?.symbol).toBe("TOK");
    expect(tokenInfo?.token?.decimals).toBe(8);

    // check adding the same registry does not produce a duplicate
    expect(BCMR.metadataRegistries.length).toBe(1);
    const otherChain = await BCMR.addMetadataRegistryAuthChain({
      transactionHash: response.txId!,
      network: Network.REGTEST,
    });
    expect(otherChain.length).toBe(1);
    expect(BCMR.metadataRegistries.length).toBe(1);

    removeAxiosMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
  });

  test("Auth chain with 3 elements", async () => {
    // tests authchain of 3 elements with all possible confirmed and unconfirmed transaction chains
    // Also change of authchain holding address is assessed
    for (const [index, mineCombo] of [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      [0, 1, 1],
      [1, 0, 0],
      [1, 0, 1],
      [1, 1, 0],
      [1, 1, 1],
    ].entries()) {
      const alice = await RegTestWallet.fromId(
        `wif:regtest:${process.env.PRIVATE_WIF!}`
      );
      const bob = await RegTestWallet.newRandom();
      const charlie = await RegTestWallet.newRandom();

      let chunks = [
        "BCMR",
        registryContentHashBinBitcoinByteOrder,
        "mainnet.cash",
      ];
      const opreturnData = OpReturnData.fromArray(chunks);
      const response = await alice.send([
        new SendRequest({ cashaddr: bob.cashaddr!, value: 10000, unit: "sat" }),
        opreturnData,
      ]);
      if (mineCombo[0]) await mine({ cashaddr: alice.cashaddr!, blocks: 1 });

      chunks[2] =
        "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json";
      const opreturnData2 = OpReturnData.fromArray(chunks);
      const response2 = await bob.send([
        new SendRequest({ cashaddr: bob.cashaddr!, value: 9500, unit: "sat" }),
        opreturnData2,
      ]);
      if (mineCombo[1]) await mine({ cashaddr: alice.cashaddr!, blocks: 1 });

      chunks[2] =
        "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json";
      const opreturnData3 = OpReturnData.fromArray(chunks);
      const response3 = await bob.send([
        new SendRequest({
          cashaddr: charlie.cashaddr!,
          value: 9000,
          unit: "sat",
        }),
        opreturnData3,
      ]);
      if (mineCombo[2]) await mine({ cashaddr: alice.cashaddr!, blocks: 1 });

      const chain = await BCMR.buildAuthChain({
        transactionHash: response.txId!,
        network: Network.REGTEST,
      });

      expect(chain.length).toBe(3);
      expect(chain[0].txHash).toBe(response.txId!);
      expect(chain[0].uris[0]).toBe("mainnet.cash");
      expect(chain[0].httpsUrl).toBe(
        "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
      );

      expect(chain[1].txHash).toBe(response2.txId!);
      expect(chain[1].uris[0]).toBe(
        "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
      );
      expect(chain[1].httpsUrl).toBe(
        "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
      );

      expect(chain[2].txHash).toBe(response3.txId!);
      expect(chain[2].uris[0]).toBe(
        "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json"
      );
      expect(chain[2].httpsUrl).toBe(
        "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json"
      );

      // extra checks for resolving chains not from head
      if (index === 0) {
        const noFollow = await BCMR.buildAuthChain({
          transactionHash: response2.txId!,
          network: Network.REGTEST,
          followToHead: false,
        });
        expect(noFollow.length).toBe(1);
        expect(noFollow[0].txHash).toBe(response2.txId!);
        expect(noFollow[0].uris[0]).toBe(
          "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
        );
        expect(noFollow[0].httpsUrl).toBe(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
        );

        const follow = await BCMR.buildAuthChain({
          transactionHash: response2.txId!,
          network: Network.REGTEST,
          followToHead: true,
        });
        expect(follow.length).toBe(2);

        expect(follow[0].txHash).toBe(response2.txId!);
        expect(follow[0].uris[0]).toBe(
          "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
        );
        expect(follow[0].httpsUrl).toBe(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
        );

        expect(follow[1].txHash).toBe(response3.txId!);
        expect(follow[1].uris[0]).toBe(
          "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json"
        );
        expect(follow[1].httpsUrl).toBe(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json"
        );
      }
    }
  });

  test("Authchain tail resolution info in registry acceleration path", async () => {
    const alice = await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF!}`
    );
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
      new SendRequest({ cashaddr: bob.cashaddr!, value: 10000, unit: "sat" }),
      opreturnData,
    ]);

    const registry_v2 = { ...registry };
    registry_v2.extensions = {
      authchain: { 0: await bob.provider!.getRawTransaction(response.txId) },
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
      new SendRequest({ cashaddr: bob.cashaddr!, value: 9500, unit: "sat" }),
      opreturnData2,
    ]);

    const registry_v3 = { ...registry };
    registry_v3.extensions = {
      authchain: {
        0: await bob.provider!.getRawTransaction(response.txId),
        1: await bob.provider!.getRawTransaction(response2.txId),
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
      new SendRequest({ cashaddr: bob.cashaddr!, value: 9000, unit: "sat" }),
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
      new SendRequest({ cashaddr: bob.cashaddr!, value: 8500, unit: "sat" }),
      opreturnData4,
    ]);

    let chain = await BCMR.buildAuthChain({
      transactionHash: response.txId!,
      network: Network.REGTEST,
    });
    expect(chain.length).toBe(4);

    chain = await BCMR.buildAuthChain({
      transactionHash: response.txId!,
      network: Network.REGTEST,
      followToHead: false,
    });
    expect(chain.length).toBe(1);

    // tail acceleration available, do not follow head
    chain = await BCMR.buildAuthChain({
      transactionHash: response3.txId!,
      network: Network.REGTEST,
      followToHead: false,
      resolveBase: true,
    });
    expect(chain.length).toBe(3);

    // resolve single element
    chain = await BCMR.buildAuthChain({
      transactionHash: response3.txId!,
      network: Network.REGTEST,
      followToHead: false,
      resolveBase: false,
    });
    expect(chain.length).toBe(1);

    // no acceleration available, will scan network
    chain = await BCMR.buildAuthChain({
      transactionHash: response4.txId!,
      network: Network.REGTEST,
      resolveBase: true,
    });
    expect(chain.length).toBe(4);

    expect(chain[0].txHash).toBe(response.txId!);
    expect(chain[0].uris[0]).toBe(
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v1.json"
    );
    expect(chain[0].httpsUrl).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v1.json"
    );

    expect(chain[1].txHash).toBe(response2.txId!);
    expect(chain[1].uris[0]).toBe(
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
    );
    expect(chain[1].httpsUrl).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
    );

    expect(chain[2].txHash).toBe(response3.txId!);
    expect(chain[2].uris[0]).toBe(
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json"
    );
    expect(chain[2].httpsUrl).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json"
    );

    expect(chain[3].txHash).toBe(response4.txId!);
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
  });

  test("Test NFT cashtoken genesis with BCMR output", async () => {
    const chunks = ["BCMR", "QmbWrG5Asp5iGmUwQHogSJGRX26zuRnuLWPytZfiL75sZv"];
    const opreturnData = OpReturnData.fromArray(chunks);

    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis(
      {
        cashaddr: alice.cashaddr!,
        capability: NFTCapability.mutable,
        commitment: "abcd",
      },
      opreturnData
    );

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await alice.getTokenBalance(tokenId);
    expect(tokenBalance).toBe(0);
    const nftTokenBalance = await alice.getNftTokenBalance(tokenId);
    expect(nftTokenBalance).toBe(1);
    const tokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);

    const transaction = await (
      alice.provider as ElectrumNetworkProvider
    ).getRawTransactionObject(genesisResponse.txId!);
    expect(transaction.vout[0].tokenData?.category).toBe(tokenId);
    expect(transaction.vout[1].scriptPubKey.type).toBe("nulldata");

    const chain = await BCMR.buildAuthChain({
      transactionHash: genesisResponse.txId!,
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
    expect(chain[0].txHash).toBe(genesisResponse.txId);

    const chainByTokenId = await BCMR.buildAuthChain({
      transactionHash: tokenId,
      network: Network.REGTEST,
    });

    expect(JSON.stringify(chain)).toBe(JSON.stringify(chainByTokenId));
  });

  test("Auth chain with forwards gaps", async () => {
    const alice = await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF!}`
    );

    const contentHashBin = sha256.hash(utf8ToBin("registry_contents"));
    const chunks = [
      "BCMR",
      contentHashBin,
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
    ];
    const opreturnData = OpReturnData.fromArray(chunks);

    const response = await alice.send([
      new SendRequest({ cashaddr: alice.cashaddr!, value: 3000, unit: "sat" }),
      opreturnData,
    ]);
    const chain = await BCMR.buildAuthChain({
      transactionHash: response.txId!,
      network: Network.REGTEST,
    });
    expect(chain.length).toBe(1);
    expect(chain[0].contentHash).toBe(binToHex(contentHashBin));
    expect(chain[0].uris[0]).toBe(
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
    expect(chain[0].httpsUrl).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
    expect(chain[0].txHash).toBe(response.txId);

    const gapTxResponse = await alice.send(
      [
        new SendRequest({
          cashaddr: alice.cashaddr!,
          value: 2000,
          unit: "sat",
        }),
      ],
      { utxoIds: [`${response.txId}:0:3000`] }
    );

    const chainHeadResponse = await alice.send(
      [
        new SendRequest({
          cashaddr: alice.cashaddr!,
          value: 1000,
          unit: "sat",
        }),
        opreturnData,
      ],
      { utxoIds: [`${gapTxResponse.txId}:0:2000`] }
    );

    const gappedChain = await BCMR.buildAuthChain({
      transactionHash: response.txId!,
      network: Network.REGTEST,
    });
    expect(gappedChain.length).toBe(2);
    expect(gappedChain[0].contentHash).toBe(binToHex(contentHashBin));
    expect(gappedChain[0].uris[0]).toBe(
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
    expect(gappedChain[0].httpsUrl).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
    expect(gappedChain[0].txHash).toBe(response.txId);

    expect(gappedChain[1].contentHash).toBe(binToHex(contentHashBin));
    expect(gappedChain[1].uris[0]).toBe(
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
    expect(gappedChain[1].httpsUrl).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
    expect(gappedChain[1].txHash).toBe(chainHeadResponse.txId);
  });

  test("Test fetching BCMR authchain from chaingraph", async () => {
    setupAxiosMock("https://gql.mainnet.cash/v1/graphql", {
      data: {
        transaction: [
          {
            hash: "\\x07275f68d14780c737279898e730cec3a7b189a761caf43b4197b60a7c891a97",
            authchains: [
              {
                authchain_length: 330,
                migrations: [
                  {
                    transaction: [
                      {
                        hash: "\\xd5721db8841ecb61ec73daeb2df7df88b180d5029061d4845efc7cb29c42183b",
                        inputs: [
                          {
                            outpoint_index: "0",
                          },
                        ],
                        outputs: [
                          {
                            output_index: "1",
                            locking_bytecode:
                              "\\x6a0442434d5220107b1719c865e8ab631f9e63f1140b51e710a86606992adc7f901b2291746abe4c506261666b7265696171706d6c727473646635637677676834366d707972696332723434696b717a71677465766e79373471646d726a6335646b78792e697066732e6e667473746f726167652e6c696e6b",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    transaction: [
                      {
                        hash: "\\x4bdcdd9a347b287e6d26d743ee4404f530a8f35501ff1adb31766edcfb2d20a9",
                        inputs: [
                          {
                            outpoint_index: "0",
                          },
                          {
                            outpoint_index: "0",
                          },
                        ],
                        outputs: [
                          {
                            output_index: "1",
                            locking_bytecode:
                              "\\x6a0442434d5240393231666263306665623665666666613639316331346633656636346234333139656138613461643266636637313064303362613661363534633962346661643f697066732e7061742e6d6e2f697066732f516d556e6661524c4356516d4e453567745274705464476b39544d6939364472507a7351554c31505a7874686637",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    transaction: [
                      {
                        hash: "\\x0d7a26fcc472d519ef83a1ca9c3a44a394b27423a55a40f7aacd1552c873e2a5",
                        inputs: [
                          {
                            outpoint_index: "0",
                          },
                        ],
                        outputs: [
                          {
                            output_index: "1",
                            locking_bytecode:
                              "\\x6a0442434d5240323065326630623531343333636566633639393732373765643239616365303438363963326366393136366465653139366538656331333561666630613162343f697066732e7061742e6d6e2f697066732f516d5339687a786a6e42394168416f46584b53626b376a454d7255354577397653726d6e624a593435555932567a",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const result: AuthChain = await BCMR.fetchAuthChainFromChaingraph({
      chaingraphUrl: "https://gql.mainnet.cash/v1/graphql",
      transactionHash:
        "07275f68d14780c737279898e730cec3a7b189a761caf43b4197b60a7c891a97",
    });
    expect(result.length).toBe(3);
    expect(result.at(-1)?.uris[0]).toBe(
      "ipfs.pat.mn/ipfs/QmS9hzxjnB9AhAoFXKSbk7jEMrU5Ew9vSrmnbJY45UY2Vz"
    );
    removeAxiosMock("https://gql.mainnet.cash/v1/graphql");
  });
});
