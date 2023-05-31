import { initProviders, disconnectProviders } from "../network";
import { ElectrumRawTransaction } from "../network/interface";
import { RegTestWallet, Wallet } from "./Wif";

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe("Utility tests", () => {
  test("Should compute raw transaction hash", async () => {
    const wallet = await RegTestWallet.newRandom();
    expect(
      await wallet.util.getTransactionHash(
        "01000000015bb9142c960a838329694d3fe9ba08c2a6421c5158d8f7044cb7c48006c1b484000000006a4730440220229ea5359a63c2b83a713fcc20d8c41b20d48fe639a639d2a8246a137f29d0fc02201de12de9c056912a4e581a62d12fb5f43ee6c08ed0238c32a1ee769213ca8b8b412103bcf9a004f1f7a9a8d8acce7b51c983233d107329ff7c4fb53e44c855dbe1f6a4feffffff02c6b68200000000001976a9141041fb024bd7a1338ef1959026bbba860064fe5f88ac50a8cf00000000001976a91445dac110239a7a3814535c15858b939211f8529888ac61ee0700"
      )
    ).toBe("36a3692a41a8ac60b73f7f41ee23f5c917413e5b2fad9e44b34865bd0d601a3d");

    // test static accessor
    expect(
      await RegTestWallet.util.getTransactionHash(
        "01000000015bb9142c960a838329694d3fe9ba08c2a6421c5158d8f7044cb7c48006c1b484000000006a4730440220229ea5359a63c2b83a713fcc20d8c41b20d48fe639a639d2a8246a137f29d0fc02201de12de9c056912a4e581a62d12fb5f43ee6c08ed0238c32a1ee769213ca8b8b412103bcf9a004f1f7a9a8d8acce7b51c983233d107329ff7c4fb53e44c855dbe1f6a4feffffff02c6b68200000000001976a9141041fb024bd7a1338ef1959026bbba860064fe5f88ac50a8cf00000000001976a91445dac110239a7a3814535c15858b939211f8529888ac61ee0700"
      )
    ).toBe("36a3692a41a8ac60b73f7f41ee23f5c917413e5b2fad9e44b34865bd0d601a3d");
  });

  test("Should throw on non-existent transaction and invalid hash", async () => {
    const wallet = await RegTestWallet.newRandom();
    await expect(
      wallet.util.decodeTransaction(
        "36a3692a41a8ac60b73f7f41ee23f5c917413e5b2fad9e44b34865bd0d601a3d"
      )
    ).rejects.toThrowError("might not exist");
    await expect(wallet.util.decodeTransaction("test")).rejects.toThrowError(
      "Invalid tx hash"
    );
  });

  test("Should get raw transaction", async () => {
    let wallet = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const utxo = (await wallet.getUtxos())[0];
    const transaction = (await wallet.provider!.getRawTransactionObject(
      utxo.txid
    )) as ElectrumRawTransaction;
    expect((await wallet.util.decodeTransaction(transaction.hash)).hash).toBe(
      utxo.txid
    );
    expect((await wallet.util.decodeTransaction(transaction.hex)).txid).toBe(
      utxo.txid
    );

    // test static accessor
    expect(
      (await RegTestWallet.util.decodeTransaction(transaction.hex)).txid
    ).toBe(utxo.txid);
  });

  test("Should decode a transaction from fist block", async () => {
    let wallet = await Wallet.newRandom();
    const decoded = await wallet.util.decodeTransaction(
      "0e3e2357e806b6cdb1f70b54c3a3a17b6714ee1f0e68bebb44a74b1efd512098"
    );

    expect(decoded.txid).toBe(
      "0e3e2357e806b6cdb1f70b54c3a3a17b6714ee1f0e68bebb44a74b1efd512098"
    );

    expect(decoded.vin[0].address).toBeUndefined();
    expect(decoded.vin[0].value).toBeUndefined();
  });

  test("Should decode a transaction and fetch input values and addresses", async () => {
    const txHash =
      "dc8f059900807c36941313f10b43ec049e23dfede4e09f8fbccc3871ed359fbe";
    const decoded = await Wallet.util.decodeTransaction(txHash, true);
    expect(decoded.vin[0].address).toBeDefined();
    expect(decoded.vin[0].value).toBeDefined();

    //  uncomment next line
    // expect(await Wallet.util.decodeTransaction(txHash)).toBe(await new Wallet().provider!.getRawTransactionObject(txHash));
  });
});
