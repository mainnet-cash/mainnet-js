import { disconnectProviders, initProviders } from "../network/Connection.js";
import { setupAxiosMock, removeAxiosMock } from "../test/axios.js";
import { BCMR } from "./Bcmr.js";
import { Registry } from "./bcmr-v1.schema.js";
import { RegTestWallet } from "./Wif";
import { OpReturnData, SendRequest } from "./model";
import { binToHex, hexToBin, sha256, utf8ToBin } from "@bitauth/libauth";
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
    version: {
      major: 0,
      minor: 1,
      patch: 0,
    },
    latestRevision: "2023-01-26T18:51:35.115Z",
    registryIdentity: {
      name: "example bcmr",
      description: "example bcmr for tokens on chipnet",
      time: {
        begin: "2023-01-26T18:51:35.115Z",
      },
    },
    identities: {
      "0000000000000000000000000000000000000000000000000000000000000000": [
        {
          name: "test tokens",
          description: "",
          time: {
            begin: "2023-01-26T18:51:35.115Z",
          },
          token: {
            category:
              "0000000000000000000000000000000000000000000000000000000000000000",
            symbol: "TOK",
            decimals: 8,
          },
        },
      ],
    },
  };

  const registryContent = JSON.stringify(registry, null, 2);
  const registryContentHashBin = sha256.hash(utf8ToBin(registryContent));
  const registryContentHash = binToHex(registryContentHashBin);
  const registryContentHashBinBitcoinByteOrder = registryContentHashBin
    .slice()
    .reverse();

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
    expect(chain[0].uri).toBe(
      "https://dweb.link/ipfs/QmbWrG5Asp5iGmUwQHogSJGRX26zuRnuLWPytZfiL75sZv"
    );
    expect(chain[0].txHash).toBe(response.txId);
  });

  test("Auth chain: BCMR, sha256 content hash, uri", async () => {
    const alice = await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF!}`
    );
    const bob = await RegTestWallet.newRandom();

    const contentHashBin = sha256.hash(utf8ToBin("registry_contents"));
    const chunks = [
      "BCMR",
      contentHashBin.slice().reverse(),
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
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
    expect(chain[0].contentHash).toBe(binToHex(contentHashBin));
    expect(chain[0].uri).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
    expect(chain[0].txHash).toBe(response.txId);
  });

  test("Auth chain: BCMR, sha256 content hash, uri and another chunk", async () => {
    const alice = await RegTestWallet.fromId(
      `wif:regtest:${process.env.PRIVATE_WIF!}`
    );
    const bob = await RegTestWallet.newRandom();

    const chunks = [
      "BCMR",
      sha256.hash(utf8ToBin("registry_contents")),
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
      "something else",
    ];
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
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
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
    expect(chain[0].uri).toBe(
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
        "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
      ];
      const opreturnData = OpReturnData.fromArray(chunks);
      const response = await alice.send([
        new SendRequest({ cashaddr: bob.cashaddr!, value: 10000, unit: "sat" }),
        opreturnData,
      ]);
      if (mineCombo[0]) await mine({ cashaddr: alice.cashaddr!, blocks: 1 });

      chunks[2] =
        "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json";
      const opreturnData2 = OpReturnData.fromArray(chunks);
      const response2 = await bob.send([
        new SendRequest({ cashaddr: bob.cashaddr!, value: 9500, unit: "sat" }),
        opreturnData2,
      ]);
      if (mineCombo[1]) await mine({ cashaddr: alice.cashaddr!, blocks: 1 });

      chunks[2] =
        "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json";
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
      expect(chain[0].uri).toBe(
        "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
      );

      expect(chain[1].txHash).toBe(response2.txId!);
      expect(chain[1].uri).toBe(
        "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
      );

      expect(chain[2].txHash).toBe(response3.txId!);
      expect(chain[2].uri).toBe(
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
        expect(noFollow[0].uri).toBe(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
        );

        const follow = await BCMR.buildAuthChain({
          transactionHash: response2.txId!,
          network: Network.REGTEST,
          followToHead: true,
        });
        expect(follow.length).toBe(2);

        expect(follow[0].txHash).toBe(response2.txId!);
        expect(follow[0].uri).toBe(
          "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
        );

        expect(follow[1].txHash).toBe(response3.txId!);
        expect(follow[1].uri).toBe(
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
    registry_v1.extensions = { authchain: [] };
    const contentHash_v1 = sha256
      .hash(utf8ToBin(JSON.stringify(registry_v1, null, 2)))
      .reverse();
    setupAxiosMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v1.json",
      JSON.stringify(registry_v1, null, 2)
    );
    let chunks = [
      "BCMR",
      contentHash_v1,
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v1.json",
    ];
    const opreturnData = OpReturnData.fromArray(chunks);
    const response = await alice.send([
      new SendRequest({ cashaddr: bob.cashaddr!, value: 10000, unit: "sat" }),
      opreturnData,
    ]);

    const registry_v2 = { ...registry };
    registry_v2.extensions = {
      authchain: [await bob.provider!.getRawTransaction(response.txId)],
    };
    const contentHash_v2 = sha256
      .hash(utf8ToBin(JSON.stringify(registry_v2, null, 2)))
      .reverse();
    setupAxiosMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json",
      JSON.stringify(registry_v2, null, 2)
    );
    chunks = [
      "BCMR",
      contentHash_v2,
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json",
    ];
    const opreturnData2 = OpReturnData.fromArray(chunks);
    const response2 = await bob.send([
      new SendRequest({ cashaddr: bob.cashaddr!, value: 9500, unit: "sat" }),
      opreturnData2,
    ]);

    const registry_v3 = { ...registry };
    registry_v3.extensions = {
      authchain: [
        await bob.provider!.getRawTransaction(response.txId),
        await bob.provider!.getRawTransaction(response2.txId),
      ],
    };
    const contentHash_v3 = sha256
      .hash(utf8ToBin(JSON.stringify(registry_v3, null, 2)))
      .reverse();
    setupAxiosMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json",
      JSON.stringify(registry_v3, null, 2)
    );
    chunks = [
      "BCMR",
      contentHash_v3,
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json",
    ];
    const opreturnData3 = OpReturnData.fromArray(chunks);
    const response3 = await bob.send([
      new SendRequest({ cashaddr: bob.cashaddr!, value: 9000, unit: "sat" }),
      opreturnData3,
    ]);

    const registry_v4 = { ...registry };
    registry_v4.extensions = {};
    const contentHash_v4 = sha256
      .hash(utf8ToBin(JSON.stringify(registry_v4, null, 2)))
      .reverse();
    setupAxiosMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v4.json",
      JSON.stringify(registry_v4, null, 2)
    );
    chunks = [
      "BCMR",
      contentHash_v4,
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v4.json",
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
    expect(chain[0].uri).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v1.json"
    );

    expect(chain[1].txHash).toBe(response2.txId!);
    expect(chain[1].uri).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
    );

    expect(chain[2].txHash).toBe(response3.txId!);
    expect(chain[2].uri).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json"
    );

    expect(chain[3].txHash).toBe(response4.txId!);
    expect(chain[3].uri).toBe(
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
    expect(chain[0].uri).toBe(
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
      contentHashBin.slice().reverse(),
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
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
    expect(chain[0].uri).toBe(
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
    expect(gappedChain[0].uri).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
    expect(gappedChain[0].txHash).toBe(response.txId);

    expect(gappedChain[1].contentHash).toBe(binToHex(contentHashBin));
    expect(gappedChain[1].uri).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
    expect(gappedChain[1].txHash).toBe(chainHeadResponse.txId);
  });
});
