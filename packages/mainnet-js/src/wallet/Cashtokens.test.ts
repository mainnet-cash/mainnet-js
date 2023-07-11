import { RegTestWallet, TestNetWallet, Wallet } from "./Wif";
import { initProviders, disconnectProviders } from "../network/Connection";
import {
  OpReturnData,
  SendRequest,
  SendResponse,
  TokenMintRequest,
  TokenSendRequest,
} from "./model";
import { Network, NFTCapability } from "../interface";
import {
  binToHex,
  binsAreEqual,
  decodeTransaction,
  hexToBin,
  utf8ToBin,
} from "@bitauth/libauth";
import { delay } from "../util";
import { Config } from "../config";

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe(`Test cashtokens`, () => {
  test("Test chipnet request", async () => {
    const wallet = await TestNetWallet.watchOnly(
      "bchtest:pzszr88euuuy87uarx9krcuh5psy4zzghsm2033xk4"
    );
    const utxos = await wallet.getTokenUtxos();
    expect(utxos[0].token?.tokenId).toBeDefined();
  });

  test("Test token genesis and max amount to send", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    await alice.send([[bob.cashaddr!, 0.101, "bch"]]);
    const genesisResponse = await bob.tokenGenesis({
      amount: 100,
    });

    const maxAmountToSend = await bob.getMaxAmountToSend();
    await bob.send([[alice.cashaddr!, maxAmountToSend.sat!, "sat"]]);
    expect(await bob.getBalance("sat")).toBe(0);
  });

  test("Test tokens will not be burned when sending bch value", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const genesisResponse = await alice.tokenGenesis({
      amount: 100,
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await alice.getTokenBalance(tokenId);
    expect(tokenBalance).toBe(100);
    const tokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);
    await alice.send([
      new SendRequest({
        cashaddr: bob.cashaddr!,
        value: 5000,
        unit: "sat",
      }),
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        amount: 25,
        tokenId: tokenId,
      }),
    ]);
    expect(await bob.getTokenBalance(tokenId)).toBe(25);
    expect(await bob.getBalance("sat")).toBe(5000);

    await bob.send(
      new SendRequest({
        cashaddr: alice.cashaddr!,
        value: 1000,
        unit: "sat",
      })
    );
    expect(await bob.getTokenBalance(tokenId)).toBe(25);
    expect(await bob.getBalance("sat")).toBe(3780);

    await bob.sendMax(alice.cashaddr!);
    expect(await bob.getTokenBalance(tokenId)).toBe(25);
    expect(await bob.getBalance("sat")).toBe(0);
  });

  test("Test fungible cashtoken genesis and sending", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const genesisResponse = await alice.tokenGenesis({
      amount: 100,
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await alice.getTokenBalance(tokenId);
    expect(tokenBalance).toBe(100);
    const tokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);
    const response = await alice.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        amount: 25,
        tokenId: tokenId,
      }),
      new TokenSendRequest({
        cashaddr: alice.cashaddr!,
        amount: 25,
        tokenId: tokenId,
      }),
    ]);
    const newTokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(newTokenUtxos.length).toBe(2);
    expect(await alice.getTokenBalance(tokenId)).toBe(75);
    expect(await bob.getTokenBalance(tokenId)).toBe(25);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(0);
    expect((await bob.getAllNftTokenBalances())[tokenId] || 0).toBe(0);

    await alice.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        amount: 75,
        tokenId: tokenId,
      }),
    ]);

    expect(await alice.getTokenBalance(tokenId)).toBe(0);
    expect(await bob.getTokenBalance(tokenId)).toBe(100);
  });

  test("Test NFT cashtoken genesis and sending", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      capability: NFTCapability.mutable,
      commitment: "abcd",
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await alice.getTokenBalance(tokenId);
    expect(tokenBalance).toBe(0);
    const nftTokenBalance = await alice.getNftTokenBalance(tokenId);
    expect(nftTokenBalance).toBe(1);
    const tokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);
    const response = await alice.send([
      {
        cashaddr: bob.cashaddr!,
        tokenId: tokenId,
        capability: NFTCapability.mutable,
        commitment: "abcd",
      } as any,
    ]);
    expect(await alice.getTokenBalance(tokenId)).toBe(0);
    expect(await alice.getNftTokenBalance(tokenId)).toBe(0);
    const newTokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(newTokenUtxos.length).toBe(0);

    expect(await bob.getTokenBalance(tokenId)).toBe(0);
    const bobTokenUtxos = await bob.getTokenUtxos(tokenId);
    expect(bobTokenUtxos.length).toBe(1);
    expect(tokenId).toEqual(response.tokenIds![0]);
    expect(bobTokenUtxos[0].token?.commitment).toEqual("abcd");
  });

  test("Test immutable NFT cashtoken genesis and sending, error on mutation", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      capability: NFTCapability.none,
      commitment: "abcd",
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await alice.getTokenBalance(tokenId);
    expect(tokenBalance).toBe(0);
    const tokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);
    await expect(
      alice.send([
        new TokenSendRequest({
          cashaddr: alice.cashaddr!,
          tokenId: tokenId,
          commitment: "abcd02",
        }),
      ])
    ).rejects.toThrow("No suitable token utxos available to send token");
  });

  test("Test mutable NFT cashtoken genesis and mutation", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      capability: NFTCapability.mutable,
      commitment: "abcd",
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await alice.getTokenBalance(tokenId);
    expect(tokenBalance).toBe(0);
    const tokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);
    const response = await alice.send([
      new TokenSendRequest({
        cashaddr: alice.cashaddr!,
        tokenId: tokenId,
        capability: NFTCapability.mutable,
        commitment: "abcd02",
      }),
    ]);
    expect(await alice.getTokenBalance(tokenId)).toBe(0);
    const newTokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(newTokenUtxos.length).toBe(1);
    expect(tokenId).toEqual(response.tokenIds![0]);
    expect(newTokenUtxos[0].token?.commitment).toEqual("abcd02");
  });

  test("Test minting NFT cashtoken genesis and minting", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      capability: NFTCapability.minting,
      commitment: "abcd",
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await alice.getTokenBalance(tokenId);
    expect(tokenBalance).toBe(0);
    const tokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);
    const response = await alice.tokenMint(tokenId, [
      new TokenMintRequest({
        cashaddr: alice.cashaddr!,
        commitment: "test",
        capability: NFTCapability.none,
      }),
      new TokenMintRequest({
        cashaddr: alice.cashaddr!,
        commitment: "test2",
        capability: NFTCapability.none,
      }),
    ]);
    expect(await alice.getTokenBalance(tokenId)).toBe(0);
    const newTokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(newTokenUtxos.length).toBe(3);
    expect(tokenId).toEqual(response.tokenIds![0]);
  });

  test("Test minting NFT and optionally burning FT cashtoken", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      amount: 4,
      capability: NFTCapability.minting,
      commitment: "abcd",
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await alice.getTokenBalance(tokenId);
    expect(tokenBalance).toBe(4);
    const tokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);

    // mint 2 NFTs, amount reducing
    const response = await alice.tokenMint(
      tokenId,
      [
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
          capability: NFTCapability.none,
          commitment: "0a",
        }),
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
          capability: NFTCapability.none,
          commitment: "0b",
        }),
      ],
      true
    );
    expect(await alice.getTokenBalance(tokenId)).toBe(2);
    const newTokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(newTokenUtxos.length).toBe(3);
    expect(tokenId).toEqual(response.tokenIds![0]);

    // mint 2 more NFTs without amount reducing
    const ftResponse = await alice.tokenMint(
      tokenId,
      [
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
          capability: NFTCapability.none,
          commitment: "0c",
        }),
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
          capability: NFTCapability.none,
          commitment: "0d",
        }),
      ],
      false
    );
    expect(await alice.getTokenBalance(tokenId)).toBe(2);
    const ftTokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(ftTokenUtxos.length).toBe(5);
    expect(tokenId).toEqual(ftResponse.tokenIds![0]);

    // we are going to hit amount -1, when minting 3 more NFTs
    // check that it will stop at 0
    const ft2Response = await alice.tokenMint(
      tokenId,
      [
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
          capability: NFTCapability.none,
          commitment: "0a",
        }),
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
          capability: NFTCapability.none,
          commitment: "0a",
        }),
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
          capability: NFTCapability.none,
          commitment: "0a",
        }),
      ],
      true
    );
    expect(await alice.getTokenBalance(tokenId)).toBe(0);
    const ft2TokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(ft2TokenUtxos.length).toBe(8);
    expect(tokenId).toEqual(ft2Response.tokenIds![0]);
  });

  test("Test explicit burning of FT", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      amount: 4,
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await alice.getTokenBalance(tokenId);
    expect(tokenBalance).toBe(4);
    const tokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);

    // burn 5 FT
    const response = await alice.tokenBurn(
      {
        tokenId: tokenId,
        amount: 5,
      },
      "burn"
    );

    const rawTx = await alice.provider!.getRawTransaction(response.txId, true);
    expect(rawTx!.vout.length).toEqual(3);
    expect(rawTx!.vout[0].scriptPubKey.type).toEqual("nulldata");
    expect(rawTx!.vout[0].scriptPubKey.hex).toContain(
      binToHex(utf8ToBin("burn"))
    );
    expect(await alice.getTokenBalance(tokenId)).toBe(0);
    const newTokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(newTokenUtxos.length).toBe(0);
    expect(tokenId).toEqual(response.tokenIds![0]);
  });

  test("Test explicit burning of FT and NFT", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      amount: 4,
      capability: NFTCapability.minting,
      commitment: "abcd",
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await alice.getTokenBalance(tokenId);
    expect(tokenBalance).toBe(4);
    const tokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);

    // burn 1 FT
    const response = await alice.tokenBurn(
      {
        tokenId: tokenId,
        amount: 1,
        capability: NFTCapability.minting,
        commitment: "abcd",
      },
      "burn"
    );

    const rawTx = await alice.provider!.getRawTransaction(response.txId, true);
    expect(rawTx!.vout.length).toEqual(3);
    expect(rawTx!.vout[0].scriptPubKey.type).toEqual("nulldata");
    expect(rawTx!.vout[0].scriptPubKey.hex).toContain(
      binToHex(utf8ToBin("burn"))
    );
    expect(await alice.getTokenBalance(tokenId)).toBe(3);
    expect((await alice.getAllTokenBalances())[tokenId]).toBe(3);
    const newTokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(newTokenUtxos.length).toBe(1);
    expect(await alice.getNftTokenBalance(tokenId)).toBe(1);
    expect((await alice.getAllNftTokenBalances())[tokenId || 0]).toBe(1);
    expect(tokenId).toEqual(response.tokenIds![0]);

    // burn the rest FTs
    const ftResponse = await alice.tokenBurn(
      {
        tokenId: tokenId,
        amount: 5,
        capability: NFTCapability.minting,
        commitment: "abcd",
      },
      "burn"
    );
    expect(await alice.getTokenBalance(tokenId)).toBe(0);
    const ftTokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(ftTokenUtxos.length).toBe(1);
    expect(tokenId).toEqual(ftResponse.tokenIds![0]);

    // burn the NFT too
    const nftResponse = await alice.tokenBurn(
      {
        tokenId: tokenId,
        capability: NFTCapability.minting,
        commitment: "abcd",
      },
      "burn"
    );
    expect(await alice.getTokenBalance(tokenId)).toBe(0);
    expect((await alice.getAllTokenBalances())[tokenId] || 0).toBe(0);
    const nftTokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(nftTokenUtxos.length).toBe(0);
    expect(tokenId).toEqual(nftResponse.tokenIds![0]);
    expect(await alice.getNftTokenBalance(tokenId)).toBe(0);
    expect((await alice.getAllNftTokenBalances())[tokenId] || 0).toBe(0);
  });

  test("Test cashtoken satoshi values and fee calculations", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const genesisResponse = await alice.tokenGenesis({
      amount: 100,
      value: 7000,
      cashaddr: bob.cashaddr!,
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await bob.getTokenBalance(tokenId);
    expect(tokenBalance).toBe(100);
    const tokenUtxos = await bob.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);
    expect(tokenUtxos[0].satoshis).toBe(7000);

    // lower the token satoshi value
    const response = await bob.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        amount: 100,
        tokenId: tokenId,
        value: 1500,
      }),
    ]);
    let newTokenUtxos = await bob.getTokenUtxos(tokenId);
    expect(newTokenUtxos.length).toBe(1);
    expect(await bob.getTokenBalance(tokenId)).toBe(100);

    let bobUtxos = await bob.getAddressUtxos(bob.cashaddr!);
    expect(bobUtxos.length).toBe(2);
    expect(bobUtxos[0].satoshis).toBe(1500);
    expect(bobUtxos[1].satoshis).toBe(5245);

    // raise the token satoshi value
    await bob.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        amount: 100,
        tokenId: tokenId,
        value: 3000,
      }),
    ]);
    newTokenUtxos = await bob.getTokenUtxos(tokenId);
    expect(newTokenUtxos.length).toBe(1);
    expect(await bob.getTokenBalance(tokenId)).toBe(100);

    bobUtxos = await bob.getAddressUtxos(bob.cashaddr!);
    expect(bobUtxos.length).toBe(2);
    expect(bobUtxos[0].satoshis).toBe(3000);
    expect(bobUtxos[1].satoshis).toBe(3349);
  });

  test("Test cashtoken waiting and watching", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();

    const genesisResponse = await alice.tokenGenesis({
      amount: 100,
      value: 5000,
      capability: NFTCapability.minting,
      commitment: "test",
      cashaddr: alice.cashaddr!,
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await alice.getTokenBalance(tokenId);
    expect(tokenBalance).toBe(100);
    const tokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);
    expect(tokenUtxos[0].satoshis).toBe(5000);

    let seenBalance = 0;
    let sendResponse: SendResponse = {};
    setTimeout(
      async () =>
        (sendResponse = await alice.send([
          new TokenSendRequest({
            cashaddr: bob.cashaddr!,
            amount: 100,
            tokenId: tokenId,
            value: 1500,
            capability: NFTCapability.minting,
            commitment: "test",
          }),
        ])),
      0
    );

    const cancel = bob.watchTokenBalance(tokenId, (balance) => {
      seenBalance = balance;
    });

    let bobTxId = ".";
    const txCancel = bob.watchAddressTokenTransactions((tx) => {
      bobTxId = tx.txid;
    });

    const balance = await bob.waitForTokenBalance(tokenId, 100);
    await delay(500);
    expect(balance).toBe(100);
    expect(seenBalance).toBe(100);
    expect(sendResponse.txId).toBe(bobTxId);
    await cancel();
    await txCancel();
    await delay(500);
  });

  test("Test double genesis should not burn tokens", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();

    // prepare inputs for two token geneses
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000, unit: "sat" });
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000, unit: "sat" });

    const genesisResponse = await bob.tokenGenesis({
      amount: 100,
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await bob.getTokenBalance(tokenId);

    expect(tokenBalance).toBe(100);
    const tokenUtxos = await bob.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);

    const genesis2Response = await bob.tokenGenesis({
      amount: 200,
    });

    const tokenId2 = genesis2Response.tokenIds![0];
    const tokenBalance2 = await bob.getTokenBalance(tokenId2);
    expect(tokenBalance2).toBe(200);
    const tokenUtxos2 = await bob.getTokenUtxos(tokenId2);
    expect(tokenUtxos2.length).toBe(1);

    expect((await bob.getTokenUtxos()).length).toBe(2);
  });

  test("Test sending tokens should not burn tokens", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();

    // prepare inputs for two token geneses
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000, unit: "sat" });
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000, unit: "sat" });

    const genesisResponse = await bob.tokenGenesis({
      amount: 100,
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await bob.getTokenBalance(tokenId);

    expect(tokenBalance).toBe(100);
    const tokenUtxos = await bob.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);

    const genesis2Response = await bob.tokenGenesis({
      amount: 200,
    });

    const tokenId2 = genesis2Response.tokenIds![0];
    const tokenBalance2 = await bob.getTokenBalance(tokenId2);
    expect(tokenBalance2).toBe(200);
    const tokenUtxos2 = await bob.getTokenUtxos(tokenId2);
    expect(tokenUtxos2.length).toBe(1);

    expect((await bob.getTokenUtxos()).length).toBe(2);

    const charlie = await RegTestWallet.newRandom();
    await bob.send({
      cashaddr: charlie.cashaddr!,
      tokenId: tokenId,
      amount: 50,
    });
    expect((await bob.getTokenUtxos()).length).toBe(2);
    expect((await charlie.getTokenUtxos()).length).toBe(1);
    expect(await bob.getTokenBalance(tokenId)).toBe(50);
    expect(await charlie.getTokenBalance(tokenId)).toBe(50);
  });

  test("Test sending bch should not burn tokens", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();

    // prepare inputs for two token geneses
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000, unit: "sat" });

    const genesisResponse = await bob.tokenGenesis({
      amount: 100,
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await bob.getTokenBalance(tokenId);

    expect(tokenBalance).toBe(100);
    const tokenUtxos = await bob.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);

    await bob.send({ cashaddr: alice.cashaddr!, value: 1000, unit: "sat" });

    const tokenBalance2 = await bob.getTokenBalance(tokenId);
    expect(tokenBalance2).toBe(100);
    const tokenUtxos2 = await bob.getTokenUtxos(tokenId);
    expect(tokenUtxos2.length).toBe(1);
  });

  test("Test minting NFTs not burn tokens", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const charlie = await RegTestWallet.newRandom();

    // prepare inputs for two token geneses
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000, unit: "sat" });

    const genesisResponse = await bob.tokenGenesis({
      capability: "minting",
      commitment: "",
    });

    const tokenId = genesisResponse.tokenIds![0];

    expect(await bob.getTokenBalance(tokenId)).toBe(0);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(1);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(1);

    await bob.tokenMint(tokenId, {
      capability: "none",
      commitment: "0a",
    });

    expect(await bob.getTokenBalance(tokenId)).toBe(0);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(2);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(2);

    await bob.send(
      new TokenSendRequest({
        tokenId: tokenId,
        capability: "none",
        commitment: "0a",
        cashaddr: charlie.cashaddr!,
      })
    );
    expect(await bob.getTokenBalance(tokenId)).toBe(0);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(1);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(1);

    expect(await charlie.getTokenBalance(tokenId)).toBe(0);
    expect(await charlie.getNftTokenBalance(tokenId)).toBe(1);
    expect((await charlie.getTokenUtxos(tokenId)).length).toBe(1);
  });

  test("Test sending NFTs after burning minting token", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const charlie = await RegTestWallet.newRandom();

    // prepare inputs for two token geneses
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000, unit: "sat" });

    const genesisResponse = await bob.tokenGenesis({
      capability: "minting",
      commitment: "",
    });

    const tokenId = genesisResponse.tokenIds![0];

    expect(await bob.getTokenBalance(tokenId)).toBe(0);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(1);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(1);

    await bob.tokenMint(tokenId, {
      capability: "none",
      commitment: "0a",
    });

    expect(await bob.getTokenBalance(tokenId)).toBe(0);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(2);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(2);

    await bob.tokenMint(tokenId, {
      capability: "none",
      commitment: "0b",
    });

    expect(await bob.getTokenBalance(tokenId)).toBe(0);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(3);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(3);

    await bob.tokenBurn({
      tokenId: tokenId,
      capability: "minting",
      commitment: "",
    });

    expect(await bob.getTokenBalance(tokenId)).toBe(0);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(2);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(2);

    await bob.send(
      new TokenSendRequest({
        tokenId: tokenId,
        capability: "none",
        commitment: "0a",
        cashaddr: charlie.cashaddr!,
      })
    );
    expect(await bob.getTokenBalance(tokenId)).toBe(0);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(1);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(1);

    expect(await charlie.getTokenBalance(tokenId)).toBe(0);
    expect(await charlie.getNftTokenBalance(tokenId)).toBe(1);
    expect((await charlie.getTokenUtxos(tokenId)).length).toBe(1);

    await bob.send(
      new TokenSendRequest({
        tokenId: tokenId,
        capability: "none",
        commitment: "0b",
        cashaddr: charlie.cashaddr!,
      })
    );
    expect(await bob.getTokenBalance(tokenId)).toBe(0);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(0);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(0);

    expect(await charlie.getTokenBalance(tokenId)).toBe(0);
    expect(await charlie.getNftTokenBalance(tokenId)).toBe(2);
    expect((await charlie.getTokenUtxos(tokenId)).length).toBe(2);
  });

  test("Test sending NFTs with empty commitment", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const charlie = await RegTestWallet.newRandom();

    // prepare inputs for two token geneses
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000, unit: "sat" });

    const genesisResponse = await bob.tokenGenesis({
      capability: "minting",
      commitment: "00",
    });

    const tokenId = genesisResponse.tokenIds![0];

    expect(await bob.getTokenBalance(tokenId)).toBe(0);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(1);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(1);

    await bob.tokenMint(tokenId, {
      capability: "none",
      commitment: "0a",
    });

    expect(await bob.getTokenBalance(tokenId)).toBe(0);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(2);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(2);

    await bob.tokenMint(tokenId, {
      capability: "none",
      commitment: "0b",
    });

    expect(await bob.getTokenBalance(tokenId)).toBe(0);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(3);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(3);

    await bob.tokenBurn({
      tokenId: tokenId,
      capability: "minting",
      commitment: "00",
    });

    expect(await bob.getTokenBalance(tokenId)).toBe(0);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(2);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(2);

    await expect(
      bob.send(
        new TokenSendRequest({
          tokenId: tokenId,
          capability: "none",
          commitment: "",
          cashaddr: charlie.cashaddr!,
        })
      )
    ).rejects.toThrow(
      "No suitable token utxos available to send token with id"
    );
  });

  test("Test splitting and merging FT and NFTs", async () => {
    // handle the cases from the following examples
    // https://bch.loping.net/tx/86f3c86e7e9c6853e489dc7ea85e2192b1b2cce691fa5ff9597e98f045a0bf72
    // https://bch.loping.net/tx/83ef2ab9687c53bb24c3d99f3cc7f0a2c7f23e180c8dbee5c845d1db6725d3e8

    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();

    await alice.send({ cashaddr: bob.cashaddr!, value: 10000, unit: "sat" });

    const genesisResponse = await bob.tokenGenesis({
      capability: "none",
      commitment: "0000000e",
      amount: 10000,
    });

    const tokenId = genesisResponse.tokenIds![0];

    expect(await bob.getTokenBalance(tokenId)).toBe(10000);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(1);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(1);

    // explicitly split FT amounts from NFT
    await bob.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        tokenId: tokenId,
        capability: "none",
        commitment: "0000000e",
      }),
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        tokenId: tokenId,
        amount: 10000,
      }),
    ]);

    expect(await bob.getTokenBalance(tokenId)).toBe(10000);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(1);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(2);

    // add FT amount to an NFT
    await bob.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        tokenId: tokenId,
        amount: 9000,
      }),
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        tokenId: tokenId,
        capability: "none",
        commitment: "0000000e",
        amount: 1000,
      }),
    ]);

    expect(await bob.getTokenBalance(tokenId)).toBe(10000);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(1);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(2);
    const tokenUtxos = await bob.getTokenUtxos(tokenId);
    expect(tokenUtxos[0].token?.amount).toBe(9000);
    expect(tokenUtxos[1].token?.amount).toBe(1000);

    // merge FT and NFT into single utxo
    await bob.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        tokenId: tokenId,
        capability: "none",
        commitment: "0000000e",
        amount: 10000,
      }),
    ]);

    expect(await bob.getTokenBalance(tokenId)).toBe(10000);
    expect(await bob.getNftTokenBalance(tokenId)).toBe(1);
    expect((await bob.getTokenUtxos(tokenId)).length).toBe(1);
  });

  test("Should encode unsigned transactions", async () => {
    const aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromId(aliceWif);
    const aliceWatchWallet = await RegTestWallet.watchOnly(
      aliceWallet.cashaddr!
    );

    let tokenId;
    {
      const aliceUtxos = await aliceWallet.getAddressUtxos();

      const { unsignedTransaction, sourceOutputs, tokenIds } =
        await aliceWatchWallet.tokenGenesis(
          {
            capability: "minting",
            commitment: "00",
          },
          undefined,
          { buildUnsigned: true }
        );
      const encodedTransaction = hexToBin(unsignedTransaction!);
      expect(encodedTransaction.length).toBeGreaterThan(0);

      // check transaction was not submitted
      expect(JSON.stringify(aliceUtxos)).toBe(
        JSON.stringify(await aliceWallet.getAddressUtxos())
      );

      const decoded = decodeTransaction(encodedTransaction);
      if (typeof decoded === "string") {
        throw decoded;
      }

      expect(
        binsAreEqual(decoded.inputs[0].unlockingBytecode, Uint8Array.from([]))
      ).toBe(true);
      expect(sourceOutputs!.length).toBe(decoded.inputs.length);
      expect(binToHex(decoded.outputs[0].token?.nft?.commitment!)).toBe("00");

      const signed = await aliceWallet.signUnsignedTransaction(
        unsignedTransaction!,
        sourceOutputs!
      );
      await aliceWallet.submitTransaction(signed);

      tokenId = tokenIds![0];

      expect(await aliceWallet.getNftTokenBalance(tokenId)).toBe(1);
      const tokenUtxos = await aliceWallet.getTokenUtxos(tokenId);
      expect(tokenUtxos.length).toBe(1);
      expect(tokenUtxos[0].token?.capability).toBe(NFTCapability.minting);
    }

    {
      const aliceUtxos = await aliceWallet.getAddressUtxos();

      const { unsignedTransaction, sourceOutputs } =
        await aliceWatchWallet.tokenMint(
          tokenId,
          {
            capability: "none",
            commitment: "0a",
          },
          undefined,
          { buildUnsigned: true }
        );
      const encodedTransaction = hexToBin(unsignedTransaction!);
      expect(encodedTransaction.length).toBeGreaterThan(0);

      // check transaction was not submitted
      expect(JSON.stringify(aliceUtxos)).toBe(
        JSON.stringify(await aliceWallet.getAddressUtxos())
      );

      const decoded = decodeTransaction(encodedTransaction);
      if (typeof decoded === "string") {
        throw decoded;
      }

      expect(
        binsAreEqual(decoded.inputs[0].unlockingBytecode, Uint8Array.from([]))
      ).toBe(true);
      expect(sourceOutputs!.length).toBe(decoded.inputs.length);
      expect(binToHex(sourceOutputs![0].token?.nft?.commitment!)).toBe("00");
      expect(binToHex(decoded.outputs[0].token?.nft?.commitment!)).toBe("00");
      expect(binToHex(decoded.outputs[1].token?.nft?.commitment!)).toBe("0a");

      const signed = await aliceWallet.signUnsignedTransaction(
        unsignedTransaction!,
        sourceOutputs!
      );
      await aliceWallet.submitTransaction(signed);

      expect(await aliceWallet.getNftTokenBalance(tokenId)).toBe(2);
      const tokenUtxos = await aliceWallet.getTokenUtxos(tokenId);
      expect(tokenUtxos.length).toBe(2);
      expect(
        tokenUtxos.filter(
          (val) => val.token?.capability === NFTCapability.minting
        ).length
      ).toBe(1);
      expect(
        tokenUtxos.filter((val) => val.token?.capability === NFTCapability.none)
          .length
      ).toBe(1);
    }

    {
      const aliceUtxos = await aliceWallet.getAddressUtxos();

      const { unsignedTransaction, sourceOutputs } =
        await aliceWatchWallet.send(
          [
            new TokenSendRequest({
              tokenId: tokenId,
              capability: "none",
              commitment: "0a",
              cashaddr: aliceWallet.cashaddr!,
            }),
          ],
          { buildUnsigned: true }
        );
      const encodedTransaction = hexToBin(unsignedTransaction!);
      expect(encodedTransaction.length).toBeGreaterThan(0);

      // check transaction was not submitted
      expect(JSON.stringify(aliceUtxos)).toBe(
        JSON.stringify(await aliceWallet.getAddressUtxos())
      );

      const decoded = decodeTransaction(encodedTransaction);
      if (typeof decoded === "string") {
        throw decoded;
      }

      expect(
        binsAreEqual(decoded.inputs[0].unlockingBytecode, Uint8Array.from([]))
      ).toBe(true);
      expect(sourceOutputs!.length).toBe(decoded.inputs.length);
      expect(binToHex(sourceOutputs![0].token?.nft?.commitment!)).toBe("0a");
      expect(binToHex(decoded.outputs[0].token?.nft?.commitment!)).toBe("0a");

      const signed = await aliceWallet.signUnsignedTransaction(
        unsignedTransaction!,
        sourceOutputs!
      );
      await aliceWallet.submitTransaction(signed);
      expect(await aliceWallet.getNftTokenBalance(tokenId)).toBe(2);
      const tokenUtxos = await aliceWallet.getTokenUtxos(tokenId);
      expect(tokenUtxos.length).toBe(2);
      expect(
        tokenUtxos.filter(
          (val) => val.token?.capability === NFTCapability.minting
        ).length
      ).toBe(1);
      expect(
        tokenUtxos.filter((val) => val.token?.capability === NFTCapability.none)
          .length
      ).toBe(1);
    }
  });

  test("Test enforcing token addresses", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      amount: 100,
    });
    const tokenId = genesisResponse.tokenIds![0];

    const previousValue = Config.EnforceCashTokenReceiptAddresses;

    const wrap = (addr) => {
      return new Promise((resolve) => {
        resolve(new TokenSendRequest({ cashaddr: addr, tokenId: "" }));
      });
    };

    Config.EnforceCashTokenReceiptAddresses = false;
    await expect(wrap(alice.cashaddr)).resolves.not.toThrow();
    await expect(wrap(alice.tokenaddr)).resolves.not.toThrow();

    await expect(
      alice.send(
        new TokenSendRequest({
          cashaddr: alice.cashaddr!,
          tokenId: tokenId,
          amount: 1,
        })
      )
    ).resolves.not.toThrow();

    await expect(
      alice.send(
        new TokenSendRequest({
          cashaddr: alice.tokenaddr!,
          tokenId: tokenId,
          amount: 2,
        })
      )
    ).resolves.not.toThrow();

    Config.EnforceCashTokenReceiptAddresses = true;
    await expect(wrap(alice.cashaddr)).rejects.toThrow();
    await expect(wrap(alice.tokenaddr)).resolves.not.toThrow();

    await expect(
      (async () =>
        await alice.send(
          new TokenSendRequest({
            cashaddr: alice.cashaddr!,
            tokenId: tokenId,
            amount: 1,
          })
        ))()
    ).rejects.toThrow();

    await expect(
      alice.send(
        new TokenSendRequest({
          cashaddr: alice.tokenaddr!,
          tokenId: tokenId,
          amount: 2,
        })
      )
    ).resolves.not.toThrow();

    Config.EnforceCashTokenReceiptAddresses = previousValue;
  });
});
