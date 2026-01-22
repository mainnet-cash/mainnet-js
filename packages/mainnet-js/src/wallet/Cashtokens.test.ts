import { RegTestWallet, TestNetWallet } from "./Wif";
import { initProviders, disconnectProviders } from "../network/Connection";
import {
  SendRequest,
  SendResponse,
  TokenMintRequest,
  TokenSendRequest,
} from "./model";
import { NFTCapability } from "../interface";
import {
  binToHex,
  binsAreEqual,
  decodeTransaction,
  hexToBin,
  utf8ToBin,
} from "@bitauth/libauth";
import { convert, delay } from "../util";
import { Config } from "../config";
import json from "../test/json.test";

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
    expect(utxos[0].token?.category).toBeDefined();
  });

  test("Test token genesis and max amount to send", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    await alice.send([
      [bob.cashaddr!, BigInt(await convert(0.101, "bch", "sat"))],
    ]);
    const genesisResponse = await bob.tokenGenesis({
      amount: 100n,
    });

    const maxAmountToSend = await bob.getMaxAmountToSend();
    await bob.send([[alice.cashaddr!, maxAmountToSend]]);
    expect(await bob.getBalance()).toBe(0n);
  });

  test("Test tokens will not be burned when sending bch value", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const genesisResponse = await alice.tokenGenesis({
      amount: 100n,
    });

    const category = genesisResponse.categories![0];
    const tokenBalance = await alice.getTokenBalance(category);
    expect(tokenBalance).toBe(100n);
    const tokenUtxos = await alice.getTokenUtxos(category);
    expect(tokenUtxos.length).toBe(1);
    await alice.send([
      new SendRequest({
        cashaddr: bob.cashaddr!,
        value: 5000n,
      }),
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        amount: 25n,
        category: category,
      }),
    ]);
    expect(await bob.getTokenBalance(category)).toBe(25n);
    expect(await bob.getBalance()).toBe(5000n);

    await bob.send(
      new SendRequest({
        cashaddr: alice.cashaddr!,
        value: 1000n,
      })
    );
    expect(await bob.getTokenBalance(category)).toBe(25n);
    expect(await bob.getBalance()).toBe(3780n);

    await bob.sendMax(alice.cashaddr!);
    expect(await bob.getTokenBalance(category)).toBe(25n);
    expect(await bob.getBalance()).toBe(0n);
  });

  test("Test fungible cashtoken genesis and sending", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const genesisResponse = await alice.tokenGenesis({
      amount: 300n,
    });

    const category = genesisResponse.categories![0];
    const tokenBalance = await alice.getTokenBalance(category);
    expect(tokenBalance).toBe(300n);
    const tokenUtxos = await alice.getTokenUtxos(category);
    expect(tokenUtxos.length).toBe(1);
    const response = await alice.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        amount: 25n,
        category: category,
      }),
      new TokenSendRequest({
        cashaddr: alice.cashaddr!,
        amount: 25n,
        category: category,
      }),
      new SendRequest({
        cashaddr: bob.cashaddr!,
        value: 20000n,
      }),
    ]);
    const newTokenUtxos = await alice.getTokenUtxos(category);
    expect(newTokenUtxos.length).toBe(2);
    expect(await alice.getTokenBalance(category)).toBe(275n);
    expect(await bob.getTokenBalance(category)).toBe(25n);
    expect(await bob.getNftTokenBalance(category)).toBe(0);
    expect((await bob.getAllNftTokenBalances())[category] || 0).toBe(0);

    await alice.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        amount: 75n,
        category: category,
      }),
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        amount: 100n,
        category: category,
      }),
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        amount: 100n,
        category: category,
      }),
    ]);

    expect(await alice.getTokenBalance(category)).toBe(0n);
    expect(await bob.getTokenBalance(category)).toBe(300n);

    await bob.tokenBurn({
      category: category,
      amount: 99n,
    });

    expect(await alice.getTokenBalance(category)).toBe(0n);
    expect(await bob.getTokenBalance(category)).toBe(201n);

    await bob.tokenBurn({
      category: category,
      amount: 200n,
    });

    expect(await bob.getTokenBalance(category)).toBe(1n);

    await bob.tokenBurn({
      category: category,
      amount: 1n,
    });
    expect(await bob.getTokenBalance(category)).toBe(0n);
  });

  test("Test NFT cashtoken genesis and sending", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      nft: {
        capability: NFTCapability.mutable,
        commitment: "abcd",
      },
    });

    const category = genesisResponse.categories![0];
    const tokenBalance = await alice.getTokenBalance(category);
    expect(tokenBalance).toBe(0n);
    const nftTokenBalance = await alice.getNftTokenBalance(category);
    expect(nftTokenBalance).toBe(1);
    const tokenUtxos = await alice.getTokenUtxos(category);
    expect(tokenUtxos.length).toBe(1);
    const response = await alice.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        category: category,
        nft: {
          capability: NFTCapability.mutable,
          commitment: "abcd",
        },
      }),
    ]);
    expect(await alice.getTokenBalance(category)).toBe(0n);
    expect(await alice.getNftTokenBalance(category)).toBe(0);
    const newTokenUtxos = await alice.getTokenUtxos(category);
    expect(newTokenUtxos.length).toBe(0);

    expect(await bob.getTokenBalance(category)).toBe(0n);
    const bobTokenUtxos = await bob.getTokenUtxos(category);
    expect(bobTokenUtxos.length).toBe(1);
    expect(category).toEqual(response.categories![0]);
    expect(bobTokenUtxos[0].token?.nft?.commitment).toEqual("abcd");
  });

  test("Test immutable NFT cashtoken genesis and sending, error on mutation", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      nft: {
        capability: NFTCapability.none,
        commitment: "abcd",
      },
    });

    const category = genesisResponse.categories![0];
    const tokenBalance = await alice.getTokenBalance(category);
    expect(tokenBalance).toBe(0n);
    const tokenUtxos = await alice.getTokenUtxos(category);
    expect(tokenUtxos.length).toBe(1);
    await expect(
      alice.send([
        new TokenSendRequest({
          cashaddr: alice.cashaddr!,
          category: category,
          nft: {
            capability: NFTCapability.none,
            commitment: "abcd02",
          },
        }),
      ])
    ).rejects.toThrow("No suitable token utxos available to send token");
  });

  test("Test mutable NFT cashtoken genesis and mutation", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      nft: {
        capability: NFTCapability.mutable,
        commitment: "abcd",
      },
    });

    const category = genesisResponse.categories![0];
    const tokenBalance = await alice.getTokenBalance(category);
    expect(tokenBalance).toBe(0n);
    const tokenUtxos = await alice.getTokenUtxos(category);
    expect(tokenUtxos.length).toBe(1);
    const response = await alice.send([
      new TokenSendRequest({
        cashaddr: alice.cashaddr!,
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
    expect(category).toEqual(response.categories![0]);
    expect(newTokenUtxos[0].token?.nft?.commitment).toEqual("abcd02");
  });

  test("Test minting NFT cashtoken genesis and minting", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      nft: {
        capability: NFTCapability.minting,
        commitment: "abcd",
      },
    });

    const category = genesisResponse.categories![0];
    const tokenBalance = await alice.getTokenBalance(category);
    expect(tokenBalance).toBe(0n);
    const tokenUtxos = await alice.getTokenUtxos(category);
    expect(tokenUtxos.length).toBe(1);
    const response = await alice.tokenMint(category, [
      new TokenMintRequest({
        cashaddr: alice.cashaddr!,
        nft: {
          commitment: "test",
          capability: NFTCapability.none,
        },
      }),
      new TokenMintRequest({
        cashaddr: alice.cashaddr!,
        nft: {
          commitment: "test2",
          capability: NFTCapability.none,
        },
      }),
    ]);
    expect(await alice.getTokenBalance(category)).toBe(0n);
    const newTokenUtxos = await alice.getTokenUtxos(category);
    expect(newTokenUtxos.length).toBe(3);
    expect(category).toEqual(response.categories![0]);
  });

  test("Test minting semifungible tokens and sending them", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      nft: {
        capability: NFTCapability.minting,
        commitment: "abcd",
      },
    });

    const category = genesisResponse.categories![0];

    // mint 2 NFTs, amount reducing
    const response = await alice.tokenMint(category, [
      new TokenMintRequest({
        cashaddr: alice.cashaddr!,
        nft: {
          capability: NFTCapability.none,
          commitment: "0a",
        },
      }),
      new TokenMintRequest({
        cashaddr: alice.cashaddr!,
        nft: {
          capability: NFTCapability.none,
          commitment: "0a",
        },
      }),
    ]);
    const newTokenUtxos = await alice.getTokenUtxos(category);
    expect(newTokenUtxos.length).toBe(3);
    expect(category).toEqual(response.categories![0]);

    const bob = await RegTestWallet.newRandom();
    await alice.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        category: category,
        nft: {
          capability: NFTCapability.none,
          commitment: "0a",
        },
      }),
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        category: category,
        nft: {
          capability: NFTCapability.none,
          commitment: "0a",
        },
      }),
    ]);

    expect((await alice.getTokenUtxos(category)).length).toBe(1);
    const bobTokenUtxos = await bob.getTokenUtxos(category);
    expect(bobTokenUtxos.length).toBe(2);
    expect(category).toEqual(response.categories![0]);
  });

  test("Test minting NFT and optionally burning FT cashtoken", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      amount: 4n,
      nft: {
        capability: NFTCapability.minting,
        commitment: "abcd",
      },
    });

    const category = genesisResponse.categories![0];
    const tokenBalance = await alice.getTokenBalance(category);
    expect(tokenBalance).toBe(4n);
    const tokenUtxos = await alice.getTokenUtxos(category);
    expect(tokenUtxos.length).toBe(1);

    // mint 2 NFTs, amount reducing
    const response = await alice.tokenMint(
      category,
      [
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
          nft: {
            capability: NFTCapability.none,
            commitment: "0a",
          },
        }),
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
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
    expect(category).toEqual(response.categories![0]);

    // mint 2 more NFTs without amount reducing
    const ftResponse = await alice.tokenMint(
      category,
      [
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
          nft: {
            capability: NFTCapability.none,
            commitment: "0c",
          },
        }),
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
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
    expect(category).toEqual(ftResponse.categories![0]);

    // we are going to hit amount -1, when minting 3 more NFTs
    // check that it will stop at 0
    const ft2Response = await alice.tokenMint(
      category,
      [
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
          nft: {
            capability: NFTCapability.none,
            commitment: "0a",
          },
        }),
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
          nft: {
            capability: NFTCapability.none,
            commitment: "0a",
          },
        }),
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
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
    expect(category).toEqual(ft2Response.categories![0]);
  });

  test("Test explicit burning of FT", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      amount: 4n,
    });

    const category = genesisResponse.categories![0];
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

    const rawTx = await alice.provider!.getRawTransactionObject(response.txId!);
    expect(rawTx!.vout.length).toEqual(3);
    expect(rawTx!.vout[0].scriptPubKey.type).toEqual("nulldata");
    expect(rawTx!.vout[0].scriptPubKey.hex).toContain(
      binToHex(utf8ToBin("burn"))
    );
    expect(await alice.getTokenBalance(category)).toBe(0n);
    const newTokenUtxos = await alice.getTokenUtxos(category);
    expect(newTokenUtxos.length).toBe(0);
    expect(category).toEqual(response.categories![0]);
  });

  test("Test explicit burning of FT and NFT", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.cashaddr!,
      amount: 4n,
      nft: {
        capability: NFTCapability.minting,
        commitment: "abcd",
      },
    });

    const category = genesisResponse.categories![0];
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

    const rawTx = await alice.provider!.getRawTransactionObject(response.txId!);
    expect(rawTx!.vout.length).toEqual(3);
    expect(rawTx!.vout[0].scriptPubKey.type).toEqual("nulldata");
    expect(rawTx!.vout[0].scriptPubKey.hex).toContain(
      binToHex(utf8ToBin("burn"))
    );
    expect(await alice.getTokenBalance(category)).toBe(3n);
    expect((await alice.getAllTokenBalances())[category]).toBe(3n);
    const newTokenUtxos = await alice.getTokenUtxos(category);
    expect(newTokenUtxos.length).toBe(1);
    expect(await alice.getNftTokenBalance(category)).toBe(1);
    expect((await alice.getAllNftTokenBalances())[category || 0]).toBe(1);
    expect(category).toEqual(response.categories![0]);

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
    expect(category).toEqual(ftResponse.categories![0]);

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
    expect(category).toEqual(nftResponse.categories![0]);
    expect(await alice.getNftTokenBalance(category)).toBe(0);
    expect((await alice.getAllNftTokenBalances())[category] || 0).toBe(0);
  });

  test("Test cashtoken satoshi values and fee calculations", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const genesisResponse = await alice.tokenGenesis({
      amount: 100n,
      value: 7000n,
      cashaddr: bob.cashaddr!,
    });

    const category = genesisResponse.categories![0];
    const tokenBalance = await bob.getTokenBalance(category);
    expect(tokenBalance).toBe(100n);
    const tokenUtxos = await bob.getTokenUtxos(category);
    expect(tokenUtxos.length).toBe(1);
    expect(tokenUtxos[0].satoshis).toBe(7000n);

    // lower the token satoshi value
    const response = await bob.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        amount: 100n,
        category: category,
        value: 1500n,
      }),
    ]);
    let newTokenUtxos = await bob.getTokenUtxos(category);
    expect(newTokenUtxos.length).toBe(1);
    expect(await bob.getTokenBalance(category)).toBe(100n);

    let bobUtxos = await bob.getAddressUtxos(bob.cashaddr!);
    expect(bobUtxos.length).toBe(2);
    expect(bobUtxos[0].satoshis).toBe(1500n);
    expect(bobUtxos[1].satoshis).toBe(5245n);

    // raise the token satoshi value
    await bob.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        amount: 100n,
        category: category,
        value: 3000n,
      }),
    ]);
    newTokenUtxos = await bob.getTokenUtxos(category);
    expect(newTokenUtxos.length).toBe(1);
    expect(await bob.getTokenBalance(category)).toBe(100n);

    bobUtxos = await bob.getAddressUtxos(bob.cashaddr!);
    expect(bobUtxos.length).toBe(2);
    expect(bobUtxos[0].satoshis).toBe(3000n);
    expect(bobUtxos[1].satoshis).toBe(3349n);
  });

  test("Test cashtoken waiting and watching", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();

    const genesisResponse = await alice.tokenGenesis({
      amount: 100n,
      value: 5000n,
      nft: {
        capability: NFTCapability.minting,
        commitment: "test",
      },
      cashaddr: alice.cashaddr!,
    });

    const category = genesisResponse.categories![0];
    const tokenBalance = await alice.getTokenBalance(category);
    expect(tokenBalance).toBe(100n);
    const tokenUtxos = await alice.getTokenUtxos(category);
    expect(tokenUtxos.length).toBe(1);
    expect(tokenUtxos[0].satoshis).toBe(5000n);

    let seenBalance = 0n;
    let sendResponse: SendResponse = {};
    setTimeout(
      async () =>
        (sendResponse = await alice.send([
          new TokenSendRequest({
            cashaddr: bob.cashaddr!,
            amount: 100n,
            category: category,
            value: 1500n,
            nft: {
              capability: NFTCapability.minting,
              commitment: "test",
            },
          }),
        ])),
      0
    );

    const cancel = await bob.watchTokenBalance(category, (balance) => {
      seenBalance = balance;
    });

    let bobTxId = ".";
    const txCancel = await bob.watchAddressTokenTransactions((tx) => {
      bobTxId = tx.txid;
    });

    const balance = await bob.waitForTokenBalance(category, 100n);
    await delay(500);
    expect(balance).toBe(100n);
    expect(seenBalance).toBe(100n);
    expect(sendResponse.txId).toBe(bobTxId);
    await cancel();
    await txCancel();
    await delay(500);
  });

  test("Test double genesis should not burn tokens", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();

    // prepare inputs for two token geneses
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000n });
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000n });

    const genesisResponse = await bob.tokenGenesis({
      amount: 100n,
    });

    const category = genesisResponse.categories![0];
    const tokenBalance = await bob.getTokenBalance(category);

    expect(tokenBalance).toBe(100n);
    const tokenUtxos = await bob.getTokenUtxos(category);
    expect(tokenUtxos.length).toBe(1);

    const genesis2Response = await bob.tokenGenesis({
      amount: 200n,
    });

    const category2 = genesis2Response.categories![0];
    const tokenBalance2 = await bob.getTokenBalance(category2);
    expect(tokenBalance2).toBe(200n);
    const tokenUtxos2 = await bob.getTokenUtxos(category2);
    expect(tokenUtxos2.length).toBe(1);

    expect((await bob.getTokenUtxos()).length).toBe(2);
  });

  test("Test sending tokens should not burn tokens", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();

    // prepare inputs for two token geneses
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000n });
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000n });

    const genesisResponse = await bob.tokenGenesis({
      amount: 100n,
    });

    const category = genesisResponse.categories![0];
    const tokenBalance = await bob.getTokenBalance(category);

    expect(tokenBalance).toBe(100n);
    const tokenUtxos = await bob.getTokenUtxos(category);
    expect(tokenUtxos.length).toBe(1);

    const genesis2Response = await bob.tokenGenesis({
      amount: 200n,
    });

    const category2 = genesis2Response.categories![0];
    const tokenBalance2 = await bob.getTokenBalance(category2);
    expect(tokenBalance2).toBe(200n);
    const tokenUtxos2 = await bob.getTokenUtxos(category2);
    expect(tokenUtxos2.length).toBe(1);

    expect((await bob.getTokenUtxos()).length).toBe(2);

    const charlie = await RegTestWallet.newRandom();
    await bob.send({
      cashaddr: charlie.cashaddr!,
      category: category,
      amount: 50n,
    });
    expect((await bob.getTokenUtxos()).length).toBe(2);
    expect((await charlie.getTokenUtxos()).length).toBe(1);
    expect(await bob.getTokenBalance(category)).toBe(50n);
    expect(await charlie.getTokenBalance(category)).toBe(50n);
  });

  test("Test sending bch should not burn tokens", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();

    // prepare inputs for two token geneses
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000n });

    const genesisResponse = await bob.tokenGenesis({
      amount: 100n,
    });

    const category = genesisResponse.categories![0];
    const tokenBalance = await bob.getTokenBalance(category);

    expect(tokenBalance).toBe(100n);
    const tokenUtxos = await bob.getTokenUtxos(category);
    expect(tokenUtxos.length).toBe(1);

    await bob.send({ cashaddr: alice.cashaddr!, value: 1000n });

    const tokenBalance2 = await bob.getTokenBalance(category);
    expect(tokenBalance2).toBe(100n);
    const tokenUtxos2 = await bob.getTokenUtxos(category);
    expect(tokenUtxos2.length).toBe(1);
  });

  test("Test sending tokens should not burn tokens", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const charlie = await RegTestWallet.newRandom();
    // prepare inputs for two token geneses
    await alice.send([
      { cashaddr: bob.cashaddr!, value: 10000n },
      { cashaddr: charlie.cashaddr!, value: 10000n },
    ]);

    const genesisResponse = await bob.tokenGenesis({
      amount: 1001n,
    });

    const category = genesisResponse.categories![0];

    const tokenBalance = await bob.getTokenBalance(category);
    expect(tokenBalance).toBe(1001n);
    const tokenUtxos = await bob.getTokenUtxos(category);
    expect(tokenUtxos.length).toBe(1);

    await bob.send({ cashaddr: alice.cashaddr!, value: 1000n });

    await bob.send([
      {
        cashaddr: charlie.cashaddr!,
        category: category,
        amount: 5n,
      },
      {
        cashaddr: charlie.cashaddr!,
        category: category,
        amount: 501n,
      },
      {
        cashaddr: charlie.cashaddr!,
        category: category,
        amount: 95n,
      },
      {
        cashaddr: charlie.cashaddr!,
        category: category,
        amount: 100n,
      },
      {
        cashaddr: charlie.cashaddr!,
        category: category,
        amount: 300n,
      },
    ]);

    const tokenBalance2 = await bob.getTokenBalance(category);
    expect(tokenBalance2).toBe(0n);
    const tokenUtxos2 = await bob.getTokenUtxos(category);
    expect(tokenUtxos2.length).toBe(0);

    const tokenBalance3 = await charlie.getTokenBalance(category);
    expect(tokenBalance3).toBe(1001n);
    const tokenUtxos3 = await charlie.getTokenUtxos(category);
    expect(tokenUtxos3.length).toBe(5);

    // charlie sends some from one of this utxos
    await charlie.send([
      {
        cashaddr: bob.cashaddr!,
        category: category,
        amount: 50n,
      },
    ]);
    const tokenBalance4 = await charlie.getTokenBalance(category);
    expect(tokenBalance4).toBe(951n);
    const tokenUtxos4 = await charlie.getTokenUtxos(category);
    expect(tokenUtxos4.length).toBe(1);

    const tokenBalance5 = await bob.getTokenBalance(category);
    expect(tokenBalance5).toBe(50n);
    const tokenUtxos5 = await bob.getTokenUtxos(category);
    expect(tokenUtxos5.length).toBe(1);
  });

  test("Test minting NFTs not burn tokens", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const charlie = await RegTestWallet.newRandom();

    // prepare inputs for two token geneses
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000n });

    const genesisResponse = await bob.tokenGenesis({
      nft: {
        capability: "minting",
        commitment: "",
      },
    });

    const category = genesisResponse.categories![0];

    expect(await bob.getTokenBalance(category)).toBe(0n);
    expect(await bob.getNftTokenBalance(category)).toBe(1);
    expect((await bob.getTokenUtxos(category)).length).toBe(1);

    await bob.tokenMint(category, {
      nft: {
        capability: "none",
        commitment: "0a",
      },
    });

    expect(await bob.getTokenBalance(category)).toBe(0n);
    expect(await bob.getNftTokenBalance(category)).toBe(2);
    expect((await bob.getTokenUtxos(category)).length).toBe(2);

    await bob.send(
      new TokenSendRequest({
        category: category,
        nft: {
          capability: "none",
          commitment: "0a",
        },
        cashaddr: charlie.cashaddr!,
      })
    );
    expect(await bob.getTokenBalance(category)).toBe(0n);
    expect(await bob.getNftTokenBalance(category)).toBe(1);
    expect((await bob.getTokenUtxos(category)).length).toBe(1);

    expect(await charlie.getTokenBalance(category)).toBe(0n);
    expect(await charlie.getNftTokenBalance(category)).toBe(1);
    expect((await charlie.getTokenUtxos(category)).length).toBe(1);
  });

  test("Test sending NFTs after burning minting token", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const charlie = await RegTestWallet.newRandom();

    // prepare inputs for two token geneses
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000n });

    const genesisResponse = await bob.tokenGenesis({
      nft: {
        capability: "minting",
        commitment: "",
      },
    });

    const category = genesisResponse.categories![0];

    expect(await bob.getTokenBalance(category)).toBe(0n);
    expect(await bob.getNftTokenBalance(category)).toBe(1);
    expect((await bob.getTokenUtxos(category)).length).toBe(1);

    await bob.tokenMint(category, {
      nft: {
        capability: "none",
        commitment: "0a",
      },
    });

    expect(await bob.getTokenBalance(category)).toBe(0n);
    expect(await bob.getNftTokenBalance(category)).toBe(2);
    expect((await bob.getTokenUtxos(category)).length).toBe(2);

    await bob.tokenMint(category, {
      nft: {
        capability: "none",
        commitment: "0b",
      },
    });

    expect(await bob.getTokenBalance(category)).toBe(0n);
    expect(await bob.getNftTokenBalance(category)).toBe(3);
    expect((await bob.getTokenUtxos(category)).length).toBe(3);

    await bob.tokenBurn({
      category: category,
      nft: {
        capability: "minting",
        commitment: "",
      },
    });

    expect(await bob.getTokenBalance(category)).toBe(0n);
    expect(await bob.getNftTokenBalance(category)).toBe(2);
    expect((await bob.getTokenUtxos(category)).length).toBe(2);

    await bob.send(
      new TokenSendRequest({
        category: category,
        nft: {
          capability: "none",
          commitment: "0a",
        },
        cashaddr: charlie.cashaddr!,
      })
    );
    expect(await bob.getTokenBalance(category)).toBe(0n);
    expect(await bob.getNftTokenBalance(category)).toBe(1);
    expect((await bob.getTokenUtxos(category)).length).toBe(1);

    expect(await charlie.getTokenBalance(category)).toBe(0n);
    expect(await charlie.getNftTokenBalance(category)).toBe(1);
    expect((await charlie.getTokenUtxos(category)).length).toBe(1);

    await bob.send(
      new TokenSendRequest({
        category: category,
        nft: {
          capability: "none",
          commitment: "0b",
        },
        cashaddr: charlie.cashaddr!,
      })
    );
    expect(await bob.getTokenBalance(category)).toBe(0n);
    expect(await bob.getNftTokenBalance(category)).toBe(0);
    expect((await bob.getTokenUtxos(category)).length).toBe(0);

    expect(await charlie.getTokenBalance(category)).toBe(0n);
    expect(await charlie.getNftTokenBalance(category)).toBe(2);
    expect((await charlie.getTokenUtxos(category)).length).toBe(2);
  });

  test("Test sending NFTs with empty commitment", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();
    const charlie = await RegTestWallet.newRandom();

    // prepare inputs for two token geneses
    await alice.send({ cashaddr: bob.cashaddr!, value: 10000n });

    const genesisResponse = await bob.tokenGenesis({
      nft: {
        capability: "minting",
        commitment: "00",
      },
    });

    const category = genesisResponse.categories![0];

    expect(await bob.getTokenBalance(category)).toBe(0n);
    expect(await bob.getNftTokenBalance(category)).toBe(1);
    expect((await bob.getTokenUtxos(category)).length).toBe(1);

    await bob.tokenMint(category, {
      nft: {
        capability: "none",
        commitment: "0a",
      },
    });

    expect(await bob.getTokenBalance(category)).toBe(0n);
    expect(await bob.getNftTokenBalance(category)).toBe(2);
    expect((await bob.getTokenUtxos(category)).length).toBe(2);

    await bob.tokenMint(category, {
      nft: {
        capability: "none",
        commitment: "0b",
      },
    });

    expect(await bob.getTokenBalance(category)).toBe(0n);
    expect(await bob.getNftTokenBalance(category)).toBe(3);
    expect((await bob.getTokenUtxos(category)).length).toBe(3);

    await bob.tokenBurn({
      category: category,
      nft: {
        capability: "minting",
        commitment: "00",
      },
    });

    expect(await bob.getTokenBalance(category)).toBe(0n);
    expect(await bob.getNftTokenBalance(category)).toBe(2);
    expect((await bob.getTokenUtxos(category)).length).toBe(2);

    await expect(
      bob.send(
        new TokenSendRequest({
          category: category,
          nft: {
            capability: "none",
            commitment: "",
          },
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

    await alice.send({ cashaddr: bob.cashaddr!, value: 10000n });

    const genesisResponse = await bob.tokenGenesis({
      nft: {
        capability: "none",
        commitment: "0000000e",
      },
      amount: 10000n,
    });

    const category = genesisResponse.categories![0];

    expect(await bob.getTokenBalance(category)).toBe(10000n);
    expect(await bob.getNftTokenBalance(category)).toBe(1);
    expect((await bob.getTokenUtxos(category)).length).toBe(1);

    // explicitly split FT amounts from NFT
    await bob.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        category: category,
        nft: {
          capability: "none",
          commitment: "0000000e",
        },
      }),
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        category: category,
        amount: 10000n,
      }),
    ]);

    expect(await bob.getTokenBalance(category)).toBe(10000n);
    expect(await bob.getNftTokenBalance(category)).toBe(1);
    expect((await bob.getTokenUtxos(category)).length).toBe(2);

    // add FT amount to an NFT
    await bob.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        category: category,
        amount: 9000n,
      }),
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        category: category,
        nft: {
          capability: "none",
          commitment: "0000000e",
        },
        amount: 1000n,
      }),
    ]);

    expect(await bob.getTokenBalance(category)).toBe(10000n);
    expect(await bob.getNftTokenBalance(category)).toBe(1);
    expect((await bob.getTokenUtxos(category)).length).toBe(2);
    const tokenUtxos = await bob.getTokenUtxos(category);
    expect(tokenUtxos[0].token?.amount).toBe(9000n);
    expect(tokenUtxos[1].token?.amount).toBe(1000n);

    // merge FT and NFT into single utxo
    await bob.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        category: category,
        nft: {
          capability: "none",
          commitment: "0000000e",
        },
        amount: 10000n,
      }),
    ]);

    expect(await bob.getTokenBalance(category)).toBe(10000n);
    expect(await bob.getNftTokenBalance(category)).toBe(1);
    expect((await bob.getTokenUtxos(category)).length).toBe(1);
  });

  test("Should encode unsigned transactions", async () => {
    const aliceWif = `wif:regtest:${process.env.PRIVATE_WIF!}`;
    const aliceWallet = await RegTestWallet.fromId(aliceWif);
    const aliceWatchWallet = await RegTestWallet.watchOnly(
      aliceWallet.cashaddr!
    );

    let category;
    {
      const aliceUtxos = await aliceWallet.getAddressUtxos();

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
      const encodedTransaction = hexToBin(unsignedTransaction!);
      expect(encodedTransaction.length).toBeGreaterThan(0);

      // check transaction was not submitted
      expect(json(aliceUtxos)).toBe(json(await aliceWallet.getAddressUtxos()));

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

      category = categories![0];

      expect(await aliceWallet.getNftTokenBalance(category)).toBe(1);
      const tokenUtxos = await aliceWallet.getTokenUtxos(category);
      expect(tokenUtxos.length).toBe(1);
      expect(tokenUtxos[0].token?.nft?.capability).toBe(NFTCapability.minting);
    }

    {
      const aliceUtxos = await aliceWallet.getAddressUtxos();

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
      const encodedTransaction = hexToBin(unsignedTransaction!);
      expect(encodedTransaction.length).toBeGreaterThan(0);

      // check transaction was not submitted
      expect(json(aliceUtxos)).toBe(json(await aliceWallet.getAddressUtxos()));

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
      const aliceUtxos = await aliceWallet.getAddressUtxos();

      const { unsignedTransaction, sourceOutputs } =
        await aliceWatchWallet.send(
          [
            new TokenSendRequest({
              category: category,
              nft: {
                capability: "none",
                commitment: "0a",
              },
              cashaddr: aliceWallet.cashaddr!,
            }),
          ],
          { buildUnsigned: true }
        );
      const encodedTransaction = hexToBin(unsignedTransaction!);
      expect(encodedTransaction.length).toBeGreaterThan(0);

      // check transaction was not submitted
      expect(json(aliceUtxos)).toBe(json(await aliceWallet.getAddressUtxos()));

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
  });

  test("Test enforcing token addresses", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const genesisResponse = await alice.tokenGenesis({
      amount: 100n,
    });
    const category = genesisResponse.categories![0];

    const previousValue = Config.EnforceCashTokenReceiptAddresses;

    const wrap = (addr) => {
      return new Promise((resolve) => {
        resolve(new TokenSendRequest({ cashaddr: addr, category: "" }));
      });
    };

    Config.EnforceCashTokenReceiptAddresses = false;
    await expect(wrap(alice.cashaddr)).resolves.not.toThrow();
    await expect(wrap(alice.tokenaddr)).resolves.not.toThrow();

    await expect(
      alice.send(
        new TokenSendRequest({
          cashaddr: alice.cashaddr!,
          category: category,
          amount: 1n,
        })
      )
    ).resolves.not.toThrow();

    await expect(
      alice.send(
        new TokenSendRequest({
          cashaddr: alice.tokenaddr!,
          category: category,
          amount: 2n,
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
            category: category,
            amount: 1n,
          })
        ))()
    ).rejects.toThrow();

    await expect(
      alice.send(
        new TokenSendRequest({
          cashaddr: alice.tokenaddr!,
          category: category,
          amount: 2n,
        })
      )
    ).resolves.not.toThrow();

    Config.EnforceCashTokenReceiptAddresses = previousValue;
  });
});
