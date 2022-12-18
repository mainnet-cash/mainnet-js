import server from "../index.js";
import request from "supertest";
import { setupAxiosMock, removeAxiosMock } from "mainnet-js";
import { sha256, binToBase64, utf8ToBin, OpReturnData } from "mainnet-js";

var app;

describe("Test Wallet BCMR Endpoints", () => {
  const registry = {
    version: { major: 1, minor: 0, patch: 0 },
    latestRevision: Date.toString(),
    registryIdentity: {
      name: "Test token registry",
      time: { begin: Date.now() },
      token: {
        category:
          "0000000000000000000000000000000000000000000000000000000000000000",
        symbol: "TOK",
        decimals: 8,
      },
    },
    extensions: {},
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

    setupAxiosMock(
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

    removeAxiosMock(
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
    const registryContentHashBinBitcoinByteOrder = registryContentHashBin
      .slice()
      .reverse();

    let chunks = [
      "BCMR",
      registryContentHashBinBitcoinByteOrder,
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry.json",
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

    setupAxiosMock(
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
    expect(chain[0].uri).toBe(
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

    removeAxiosMock(
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
      authchain: [(await request(app).post("/wallet/util/get_raw_transaction").send({
        txHash: response.txId,
        network: "regtest",
      })).body.txHex],
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
    const response2 = (await request(app).post("/wallet/send").send({
      walletId: bobId,
      to: [
      { cashaddr: bobCashaddr, value: 9500, unit: "sat" },
      { dataBuffer: binToBase64(opreturnData2.buffer) },
    ]})).body;

    const registry_v3 = { ...registry };
    registry_v3.extensions = {
      authchain: [
        (await request(app).post("/wallet/util/get_raw_transaction").send({
          txHash: response.txId,
          network: "regtest",
        })).body.txHex,
        (await request(app).post("/wallet/util/get_raw_transaction").send({
          txHash: response2.txId,
          network: "regtest",
        })).body.txHex,
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
    const response3 = (await request(app).post("/wallet/send").send({
      walletId: bobId,
      to: [
      { cashaddr: bobCashaddr, value: 9000, unit: "sat" },
      { dataBuffer: binToBase64(opreturnData3.buffer) },
    ]})).body;

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
    expect(chain[0].uri).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v1.json"
    );

    expect(chain[1].txHash).toBe(response2.txId);
    expect(chain[1].uri).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v2.json"
    );

    expect(chain[2].txHash).toBe(response3.txId);
    expect(chain[2].uri).toBe(
      "https://mainnet.cash/.well-known/bitcoin-cash-metadata-registry_v3.json"
    );

    expect(chain[3].txHash).toBe(response4.txId);
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
});
