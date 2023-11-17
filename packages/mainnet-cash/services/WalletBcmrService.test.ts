import server from "../index.js";
import request from "supertest";
import { setupFetchMock, removeFetchMock, binToHex } from "mainnet-js";
import { sha256, binToBase64, utf8ToBin, OpReturnData, NFTCapability } from "mainnet-js";

var app;

describe("Test Wallet BCMR Endpoints", () => {
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
            icon: "https://example.com/nft"
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
                      icon: "https://example.com/nft/00.jpg"
                    }
                  }
                }
              }
            }
          },
        },
      },
    },
    extensions: {}
  };

  beforeAll(async function () {
    app = await server.getServer().launch();
  });
  afterAll(async function () {
    await server.killElectrum()
    app.close();
  });

  test("Add metadata registry and get token info", async () => {
    expect(
      (await request(app).post("/wallet/bcmr/get_token_info").send({
      tokenId: "0000000000000000000000000000000000000000000000000000000000000000"
    })).body.tokenInfo
    ).toBe(undefined);

    await request(app).post("/wallet/bcmr/add_registry").send(registry);
    const tokenInfo = (await request(app).post("/wallet/bcmr/get_token_info").send({
      tokenId: "0000000000000000000000000000000000000000000000000000000000000000"
    })).body.tokenInfo;
    expect(tokenInfo?.token?.symbol).toBe("TOK");
    expect(tokenInfo?.token?.decimals).toBe(8);

    // check adding the same registry does not produce a duplicate
    expect((await request(app).post("/wallet/bcmr/get_registries").send({})).body.length).toBe(1);
    await request(app).post("/wallet/bcmr/add_registry").send(registry);
    expect((await request(app).post("/wallet/bcmr/get_registries").send({})).body.length).toBe(1);
  });

  test(`Add metadata from uri and get token info`, async () => {
    await request(app).post("/wallet/bcmr/reset_registries").send({});

    setupFetchMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
      registry
    );

    expect(
      (await request(app).post("/wallet/bcmr/get_token_info").send({
      tokenId: "0000000000000000000000000000000000000000000000000000000000000000"
    })).body.tokenInfo
    ).toBe(undefined);
    await request(app).post("/wallet/bcmr/add_registry_from_uri").send({uri:
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    });
    const tokenInfo = (await request(app).post("/wallet/bcmr/get_token_info").send({
      tokenId: "0000000000000000000000000000000000000000000000000000000000000000"
    })).body.tokenInfo;
    expect(tokenInfo?.token?.symbol).toBe("TOK");
    expect(tokenInfo?.token?.decimals).toBe(8);

    // check adding the same registry does not produce a duplicate
    expect((await request(app).post("/wallet/bcmr/get_registries").send({})).body.length).toBe(1);
    await request(app).post("/wallet/bcmr/add_registry_from_uri").send({uri:
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    });
    expect((await request(app).post("/wallet/bcmr/get_registries").send({})).body.length).toBe(1);

    removeFetchMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
  });

  test("Auth chain with 1 element, add resolved registry", async () => {
    await request(app).post("/wallet/bcmr/reset_registries").send({});

    const aliceId = process.env.ALICE_ID!;
    const bobResp = (await request(app).post("/wallet/create").send({
      type: "wif",
      network: "regtest",
    })).body;
    const bobId = bobResp.walletId;
    const bobCashaddr = bobResp.cashaddr;

    const registryContent = JSON.stringify(registry, null, 2);
    const registryContentHashBin = sha256.hash(utf8ToBin(registryContent));
    const registryContentHashBinBitcoinByteOrder = registryContentHashBin;

    let chunks = [
      "BCMR",
      registryContentHashBinBitcoinByteOrder,
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
    ];
    const opreturnData = OpReturnData.fromArray(chunks);
    const response = (await request(app).post("/wallet/send").send({
      walletId: aliceId,
      to: [
      {
        cashaddr: bobCashaddr,
        value: 10000,
        unit: "sat",
      }, {
        dataBuffer: binToBase64(opreturnData.buffer)
      }
    ]})).body;

    setupFetchMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
      registry
    );

    expect(
      (await request(app).post("/wallet/bcmr/get_token_info").send({
      tokenId: "0000000000000000000000000000000000000000000000000000000000000000"
    })).body.tokenInfo
    ).toBe(undefined);
    const chain = (await request(app).post("/wallet/bcmr/add_registry_authchain").send({
      transactionHash: response.txId,
      network: "regtest",
    })).body;
    expect(chain.length).toBe(1);
    expect(chain[0].txHash).toBe(response.txId);
    expect(chain[0].uris[0]).toBe(
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
    expect(chain[0].httpsUrl).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );

    const tokenInfo = (await request(app).post("/wallet/bcmr/get_token_info").send({
      tokenId: "0000000000000000000000000000000000000000000000000000000000000000"
    })).body.tokenInfo
    expect(tokenInfo?.token?.symbol).toBe("TOK");
    expect(tokenInfo?.token?.decimals).toBe(8);

    // check adding the same registry does not produce a duplicate
    expect((await request(app).post("/wallet/bcmr/get_registries").send({})).body.length).toBe(1);
    const otherChain = (await request(app).post("/wallet/bcmr/add_registry_authchain").send({
      transactionHash: response.txId,
      network: "regtest",
    })).body;
    expect(otherChain.length).toBe(1);
    expect((await request(app).post("/wallet/bcmr/get_registries").send({})).body.length).toBe(1);

    removeFetchMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json"
    );
  });

  test("Authchain tail resolution info in registry acceleration path", async () => {
    await request(app).post("/wallet/bcmr/reset_registries").send({});

    const aliceId = process.env.ALICE_ID!;
    const bobResp = (await request(app).post("/wallet/create").send({
      type: "wif",
      network: "regtest",
    })).body;
    const bobId = bobResp.walletId;
    const bobCashaddr = bobResp.cashaddr;

    const registry_v1 = { ...registry };
    registry_v1.extensions = { authchain: {} };
    const contentHash_v1 = sha256
      .hash(utf8ToBin(JSON.stringify(registry_v1, null, 2)));
    setupFetchMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v1.json",
      JSON.stringify(registry_v1, null, 2)
    );
    let chunks = [
      "BCMR",
      contentHash_v1,
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v1.json",
    ];
    const opreturnData = OpReturnData.fromArray(chunks);
    const response = (await request(app).post("/wallet/send").send({
      walletId: aliceId,
      to: [
      {
        cashaddr: bobCashaddr,
        value: 10000,
        unit: "sat",
      }, {
        dataBuffer: binToBase64(opreturnData.buffer)
      }
    ]})).body;

    const registry_v2 = { ...registry };
    registry_v2.extensions = {
      authchain: {0: (await request(app).post("/wallet/util/get_raw_transaction").send({
        txHash: response.txId,
        network: "regtest",
      })).body.txHex},
    };
    const contentHash_v2 = sha256
      .hash(utf8ToBin(JSON.stringify(registry_v2, null, 2)));
    setupFetchMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json",
      JSON.stringify(registry_v2, null, 2)
    );
    chunks = [
      "BCMR",
      contentHash_v2,
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json",
    ];
    const opreturnData2 = OpReturnData.fromArray(chunks);
    const response2 = (await request(app).post("/wallet/send").send({
      walletId: bobId,
      to: [
      { cashaddr: bobCashaddr, value: 9500, unit: "sat" },
      { dataBuffer: binToBase64(opreturnData2.buffer) },
    ]})).body;

    const registry_v3 = { ...registry };
    registry_v3.extensions = {
      authchain: {
        0: (await request(app).post("/wallet/util/get_raw_transaction").send({
          txHash: response.txId,
          network: "regtest",
        })).body.txHex,
        1: (await request(app).post("/wallet/util/get_raw_transaction").send({
          txHash: response2.txId,
          network: "regtest",
        })).body.txHex,
      },
    };
    const contentHash_v3 = sha256
      .hash(utf8ToBin(JSON.stringify(registry_v3, null, 2)));
    setupFetchMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json",
      JSON.stringify(registry_v3, null, 2)
    );
    chunks = [
      "BCMR",
      contentHash_v3,
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json",
    ];
    const opreturnData3 = OpReturnData.fromArray(chunks);
    const response3 = (await request(app).post("/wallet/send").send({
      walletId: bobId,
      to: [
      { cashaddr: bobCashaddr, value: 9000, unit: "sat" },
      { dataBuffer: binToBase64(opreturnData3.buffer) },
    ]})).body;

    const registry_v4 = { ...registry };
    registry_v4.extensions = {};
    const contentHash_v4 = sha256
      .hash(utf8ToBin(JSON.stringify(registry_v4, null, 2)));
    setupFetchMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v4.json",
      JSON.stringify(registry_v4, null, 2)
    );
    chunks = [
      "BCMR",
      contentHash_v4,
      "mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v4.json",
    ];
    const opreturnData4 = OpReturnData.fromArray(chunks);
    const response4 = (await request(app).post("/wallet/send").send({
      walletId: bobId,
      to: [
      { cashaddr: bobCashaddr, value: 8500, unit: "sat" },
      { dataBuffer: binToBase64(opreturnData4.buffer) },
    ]})).body;

    let chain = (await request(app).post("/wallet/bcmr/build_authchain").send({
      transactionHash: response.txId,
      network: "regtest",
    })).body;

    expect(chain.length).toBe(4);

    chain = (await request(app).post("/wallet/bcmr/build_authchain").send({
      transactionHash: response.txId,
      network: "regtest",
      followToHead: false,
    })).body;
    expect(chain.length).toBe(1);

    // tail acceleration available, do not follow head
    chain = (await request(app).post("/wallet/bcmr/build_authchain").send({
      transactionHash: response3.txId,
      network: "regtest",
      followToHead: false,
      resolveBase: true,
    })).body;
    expect(chain.length).toBe(3);

    // resolve single element
    chain = (await request(app).post("/wallet/bcmr/build_authchain").send({
      transactionHash: response3.txId,
      network: "regtest",
      followToHead: false,
      resolveBase: false,
    })).body;
    expect(chain.length).toBe(1);

    // no acceleration available, will scan network
    chain = (await request(app).post("/wallet/bcmr/build_authchain").send({
      transactionHash: response.txId,
      network: "regtest",
      resolveBase: true,
    })).body;
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

    removeFetchMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v1.json"
    );
    removeFetchMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
    );
    removeFetchMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json"
    );
    removeFetchMock(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v4.json"
    );
  });


  test("Test NFT cashtoken genesis with BCMR output", async () => {
    const chunks = ["BCMR", "QmbWrG5Asp5iGmUwQHogSJGRX26zuRnuLWPytZfiL75sZv"];
    const opreturnData = OpReturnData.fromArray(chunks);

    const aliceId = process.env.ALICE_ID!;
    const genesisResponse = (await request(app).post("/wallet/token_genesis").send({
      walletId: aliceId,
      capability: NFTCapability.mutable,
      commitment: "abcd",
      sendRequests: {
        dataBuffer: binToBase64(opreturnData.buffer)
      }
    })).body;

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = (await request(app).post("/wallet/get_token_balance").send({
      walletId: aliceId,
      tokenId: tokenId,
    })).body.balance;
    expect(tokenBalance).toBe(0n);
    const nftTokenBalance = (await request(app).post("/wallet/get_nft_token_balance").send({
      walletId: aliceId,
      tokenId: tokenId,
    })).body.balance;
    expect(nftTokenBalance).toBe(1);
    const tokenUtxos = (await request(app).post("/wallet/get_token_utxos").send({
      walletId: aliceId,
      tokenId: tokenId,
    })).body;
    expect(tokenUtxos.length).toBe(1);

    const rawTx = (await request(app).post("/wallet/util/get_raw_transaction").send({
      txHash: genesisResponse.txId,
      network: "regtest",
      verbose: true,
    })).body;

    expect(rawTx.vout[0].tokenData?.category).toBe(tokenId);
    expect(rawTx!.vout[1].scriptPubKey.type).toEqual("nulldata");
    expect(rawTx!.vout[1].scriptPubKey.hex).toContain(
      binToHex(utf8ToBin("BCMR"))
    );

    const chain = (await request(app).post("/wallet/bcmr/build_authchain").send({
      transactionHash: genesisResponse.txId,
      network: "regtest",
    })).body;

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
  });
});
