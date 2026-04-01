import { Config } from "../config.js";
import { NetworkType } from "../enum.js";
import { mine } from "../mine/index.js";
import { disconnectProviders, initProviders } from "../network/index.js";
import { delay } from "../util/delay.js";
import { decodeTransaction, getTransactionHash } from "./Util.js";
import { RegTestWallet, Wallet } from "./Wif.js";

const isMock = !!process.env.USE_MOCK_PROVIDER;

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe("Utility tests", () => {
  test("Should compute raw transaction hash", async () => {
    expect(
      await getTransactionHash(
        "01000000015bb9142c960a838329694d3fe9ba08c2a6421c5158d8f7044cb7c48006c1b484000000006a4730440220229ea5359a63c2b83a713fcc20d8c41b20d48fe639a639d2a8246a137f29d0fc02201de12de9c056912a4e581a62d12fb5f43ee6c08ed0238c32a1ee769213ca8b8b412103bcf9a004f1f7a9a8d8acce7b51c983233d107329ff7c4fb53e44c855dbe1f6a4feffffff02c6b68200000000001976a9141041fb024bd7a1338ef1959026bbba860064fe5f88ac50a8cf00000000001976a91445dac110239a7a3814535c15858b939211f8529888ac61ee0700",
      ),
    ).toBe("36a3692a41a8ac60b73f7f41ee23f5c917413e5b2fad9e44b34865bd0d601a3d");
  });

  test("Should throw on non-existent transaction and invalid hash", async () => {
    await expect(
      decodeTransaction(
        "36a3692a41a8ac60b73f7f41ee23f5c917413e5b2fad9e44b34865bd0d601a3d",
        false,
        NetworkType.Regtest,
      ),
    ).rejects.toThrowError("might not exist");
    await expect(
      decodeTransaction("test", false, NetworkType.Regtest),
    ).rejects.toThrowError("Invalid tx hash");
  });

  test("Should get raw transaction", async () => {
    let wallet = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const utxo = (await wallet.getUtxos())[0];
    const transaction = await wallet.provider!.getRawTransactionObject(
      utxo.txid,
    );
    expect(
      (await decodeTransaction(transaction.hash, false, NetworkType.Regtest))
        .hash,
    ).toBe(utxo.txid);
    expect(
      (await decodeTransaction(transaction.hex, false, NetworkType.Regtest))
        .txid,
    ).toBe(utxo.txid);
  });

  (isMock ? test.skip : test)(
    "Should decode a transaction from fist block",
    async () => {
      const decoded = await decodeTransaction(
        "0e3e2357e806b6cdb1f70b54c3a3a17b6714ee1f0e68bebb44a74b1efd512098",
      );

      expect(decoded.txid).toBe(
        "0e3e2357e806b6cdb1f70b54c3a3a17b6714ee1f0e68bebb44a74b1efd512098",
      );

      expect((decoded.vin[0] as any).address).toBeUndefined();
    },
  );

  (isMock ? test.skip : test)(
    "Should decode a transaction and fetch input values and addresses",
    async () => {
      const txHash =
        "dc8f059900807c36941313f10b43ec049e23dfede4e09f8fbccc3871ed359fbe";
      const decoded = await decodeTransaction(txHash, true);
      expect(decoded.vin[0].scriptPubKey.addresses[0]).toBeDefined();
      expect(decoded.vin[0].value).toBeDefined();
    },
  );
});

describe("Dynamic confirmations via fetchHeight", () => {
  test("confirmations defaults to 0 for decoded mempool transactions", async () => {
    const decoded = await decodeTransaction(
      "01000000015bb9142c960a838329694d3fe9ba08c2a6421c5158d8f7044cb7c48006c1b484000000006a4730440220229ea5359a63c2b83a713fcc20d8c41b20d48fe639a639d2a8246a137f29d0fc02201de12de9c056912a4e581a62d12fb5f43ee6c08ed0238c32a1ee769213ca8b8b412103bcf9a004f1f7a9a8d8acce7b51c983233d107329ff7c4fb53e44c855dbe1f6a4feffffff02c6b68200000000001976a9141041fb024bd7a1338ef1959026bbba860064fe5f88ac50a8cf00000000001976a91445dac110239a7a3814535c15858b939211f8529888ac61ee0700",
      false,
      NetworkType.Regtest,
    );
    expect(decoded.confirmations).toBe(0);
  });

  test("confirmations is present on verbose server response", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const utxo = (await alice.getUtxos())[0];
    const transaction = await alice.provider.getRawTransactionObject(utxo.txid);
    expect(transaction.confirmations).toBeGreaterThan(0);
  });

  test("fetchHeight is not exposed in returned transaction", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const utxo = (await alice.getUtxos())[0];
    const transaction = await alice.provider.getRawTransactionObject(utxo.txid);
    expect((transaction as any).fetchHeight).toBeUndefined();
  });

  test("cached transaction has up-to-date confirmations", async () => {
    const memoryCacheValue = Config.UseMemoryCache;
    Config.UseMemoryCache = true;
    try {
      const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
      const utxo = (await alice.getUtxos())[0];

      const tx1 = await alice.provider.getRawTransactionObject(utxo.txid);
      const confirmations1 = tx1.confirmations;

      await mine({ cashaddr: alice.cashaddr!, blocks: 1 });
      await delay(1000);

      const tx2 = await alice.provider.getRawTransactionObject(utxo.txid);
      expect(tx2.confirmations).toBe(confirmations1 + 1);
      expect((tx2 as any).fetchHeight).toBeUndefined();
    } finally {
      Config.UseMemoryCache = memoryCacheValue;
    }
  });
});
