import { RegTestWallet, TestNetWallet, Wallet } from "./Wif";
import { initProviders, disconnectProviders } from "../network/Connection";
import { SendRequest, TokenMintRequest, TokenSendRequest } from "./model";
import { Network, NFTCapability } from "../interface";
import { binToHex, utf8ToBin } from "@bitauth/libauth";
import { delay } from "../util";

beforeAll(async () => {
  await initProviders([Network.REGTEST]);
});
afterAll(async () => {
  await disconnectProviders([Network.REGTEST]);
});

describe(`Test cashtokens`, () => {
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
    ).rejects.toThrow("Can not change the commitment of an immutable token");
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
      }),
      new TokenMintRequest({
        cashaddr: alice.cashaddr!,
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
        }),
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
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
        }),
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
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
        }),
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
        }),
        new TokenMintRequest({
          cashaddr: alice.cashaddr!,
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

  test("Test explicit burning of FT+NFT", async () => {
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

  test("Test cashtoken waiting and watching balance", async () => {
    const alice = await RegTestWallet.fromId(process.env.ALICE_ID!);
    const bob = await RegTestWallet.newRandom();

    const genesisResponse = await alice.tokenGenesis({
      amount: 100,
      value: 5000,
      cashaddr: alice.cashaddr!,
    });

    const tokenId = genesisResponse.tokenIds![0];
    const tokenBalance = await alice.getTokenBalance(tokenId);
    expect(tokenBalance).toBe(100);
    const tokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(tokenUtxos.length).toBe(1);
    expect(tokenUtxos[0].satoshis).toBe(5000);

    let seenBalance = 0;
    setTimeout(
      () =>
        alice.send([
          new TokenSendRequest({
            cashaddr: bob.cashaddr!,
            amount: 100,
            tokenId: tokenId,
            value: 1500,
          }),
        ]),
      0
    );

    const cancel = bob.watchTokenBalance(tokenId, (balance) => {
      seenBalance = balance;
    });

    const balance = await bob.waitForTokenBalance(tokenId, 100);
    expect(balance).toBe(100);
    expect(seenBalance).toBe(100);
    await cancel();
    await delay(500);
  });
});