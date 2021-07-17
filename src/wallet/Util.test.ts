import { ElectrumRawTransaction } from "../network/interface";
import { RegTestWallet, Wallet } from "./Wif";

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
  const utxo = (await wallet.getUtxos()).utxos![0];
  const transaction = (await wallet.provider!.getRawTransactionObject(
    utxo.txId
  )) as ElectrumRawTransaction;
  expect((await wallet.util.decodeTransaction(transaction.hash)).hash).toBe(
    utxo.txId
  );
  expect((await wallet.util.decodeTransaction(transaction.hex)).txid).toBe(
    utxo.txId
  );

  // test static accessor
  expect(
    (await RegTestWallet.util.decodeTransaction(transaction.hex)).txid
  ).toBe(utxo.txId);
});

test("Should decode a transaction from fist block", async () => {
  let wallet = await Wallet.newRandom();
  const decoded = await wallet.util.decodeTransaction(
    "0e3e2357e806b6cdb1f70b54c3a3a17b6714ee1f0e68bebb44a74b1efd512098"
  );

  expect(decoded.txid).toBe(
    "0e3e2357e806b6cdb1f70b54c3a3a17b6714ee1f0e68bebb44a74b1efd512098"
  );
});

test("Should decode a transaction with libauth", async () => {
  // console.log(await Wallet.util.decodeTransactionLibAuth("dc8f059900807c36941313f10b43ec049e23dfede4e09f8fbccc3871ed359fbe", false));
  console.log(await Wallet.util.decodeTransactionLibAuth("0100000002b563485292338c0b812676f2a0864e84d91b962a2d728796d7fea05332999481010000006a47304402200bc401ffc5dbb91491e8b7d23cc1c1899b808c9d1fd7b9a949b89dc13d82c3b202206bb51c1d6bdb97d933bd7ae657d3130a96bfce2c2baaf3e066bfee1d6a5482704121028e18f4f60036dd716e7f3b1926777d2359bc3bf6dc34ecd0c9181b1278412028ffffffffff20a49c11d612dac417b21a425f1a193496f86b04fe981c3799596bdfe75daa000000006b483045022100b222fb5b24927d09202c660e32c3b4b6c4a7c6c0a2b5d50dac6913435112686c022058c5b8ef12ce330c8def00d0d42a8d552b41e9cfa9ccfa4dfc8081167a55a126412103200e9b5d0732421f75fe4d3c348ffeb7678727a76e2d4c4f404c33765278b01effffffff02c04c0904000000001976a9146fa52eab9aa1ac1d4538b1decd354fd6463130a088ac5f3e0e02000000001976a9145b74be5d956ea58b9bde873a6ba3fff3ebf7ddcc88ac00000000"));
  // console.log(await Wallet.util.decodeTransactionLibAuth("01000000015bb9142c960a838329694d3fe9ba08c2a6421c5158d8f7044cb7c48006c1b484000000006a4730440220229ea5359a63c2b83a713fcc20d8c41b20d48fe639a639d2a8246a137f29d0fc02201de12de9c056912a4e581a62d12fb5f43ee6c08ed0238c32a1ee769213ca8b8b412103bcf9a004f1f7a9a8d8acce7b51c983233d107329ff7c4fb53e44c855dbe1f6a4feffffff02c6b68200000000001976a9141041fb024bd7a1338ef1959026bbba860064fe5f88ac50a8cf00000000001976a91445dac110239a7a3814535c15858b939211f8529888ac61ee0709"));
  // console.log(await Wallet.util.decodeTransactionLibAuth("0e3e2357e806b6cdb1f70b54c3a3a17b6714ee1f0e68bebb44a74b1efd512090"));
});
