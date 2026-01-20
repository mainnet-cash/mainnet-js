import { assertSuccess, decodeTransaction, hexToBin } from "@bitauth/libauth";
import { HDWallet, RegTestHDWallet } from "./HDWallet";
import { RegTestWallet, Wallet } from "./Wif";
import { Config } from "../config";
import { getNextUnusedIndex } from "../util/hd";
import { NFTCapability } from "../interface";
import { TokenMintRequest, TokenSendRequest } from "./model";
import { stringify } from "../cache";

const expectedXpub =
  "xpub6CGqRCnS5qDfyxtzV3y3tj8CY7qf3z3GiB2qnCUTdNkhpNxbLtobrU5ZXBVPG3rzPcBUpJAoj3K1u1jyDwKuduL71gLPm27Tckc85apgQRr";
const expectedXprv =
  "xprv9yHV1hFYFTfNmUpXP2S3XbBTz61AeXKRLx7Eyp4r53DiwadSoMVMJfm5fvtxBc3NFKfozcH42LM66Kb5VaxdLvGk43JWahCegx6iaEJbkB2";

describe("HDWallet", () => {
  it("should create a new HDWallet instance", async () => {
    const wallet = await Wallet.fromSeed(
      "divide battle bulb improve hockey favorite charge save merit fatal frog cage"
    );
    const walletSeed = await HDWallet.fromSeed(
      "divide battle bulb improve hockey favorite charge save merit fatal frog cage"
    );
    const walletPriv = await HDWallet.fromXPriv(expectedXprv);
    const walletPub = await HDWallet.fromXPub(expectedXpub);

    expect(walletSeed.xPub).toBe(expectedXpub);
    expect(walletSeed.xPriv).toBe(expectedXprv);
    expect(walletPriv.xPub).toBe(expectedXpub);
    expect(walletPriv.xPriv).toBe(expectedXprv);
    expect(walletPub.xPub).toBe(expectedXpub);

    expect(wallet.getDepositAddress()).toBe(walletSeed.getDepositAddress());
    expect(wallet.getDepositAddress()).toBe(walletPriv.getDepositAddress());
    expect(wallet.getDepositAddress()).toBe(walletPub.getDepositAddress());

    expect(walletSeed.getChangeAddress()).toBe(walletPriv.getChangeAddress());
    expect(walletSeed.getChangeAddress()).toBe(walletPub.getChangeAddress());
  });

  it("should serialize", async () => {
    const wallet = await HDWallet.fromSeed(
      "divide battle bulb improve hockey favorite charge save merit fatal frog cage"
    );
    expect(wallet.toString()).toBe(
      "hd:mainnet:divide battle bulb improve hockey favorite charge save merit fatal frog cage:m/44'/0'/0':0:0"
    );
    expect(wallet.toDbString()).toBe(
      "hd:mainnet:divide battle bulb improve hockey favorite charge save merit fatal frog cage:m/44'/0'/0':0:0"
    );

    wallet.name = "testWallet";
    expect(wallet.toString()).toBe("named:mainnet:testWallet");
    expect(wallet.toDbString()).toBe(
      "hd:mainnet:divide battle bulb improve hockey favorite charge save merit fatal frog cage:m/44'/0'/0':0:0"
    );

    const xPrivWallet = await HDWallet.fromXPriv(expectedXprv);
    expect(xPrivWallet.toString()).toBe(
      "hd:mainnet:xprv9yHV1hFYFTfNmUpXP2S3XbBTz61AeXKRLx7Eyp4r53DiwadSoMVMJfm5fvtxBc3NFKfozcH42LM66Kb5VaxdLvGk43JWahCegx6iaEJbkB2:0:0"
    );

    const xPubWallet = await HDWallet.fromXPub(expectedXpub);
    expect(xPubWallet.toString()).toBe(
      "hd:mainnet:xpub6CGqRCnS5qDfyxtzV3y3tj8CY7qf3z3GiB2qnCUTdNkhpNxbLtobrU5ZXBVPG3rzPcBUpJAoj3K1u1jyDwKuduL71gLPm27Tckc85apgQRr:0:0"
    );

    const uninitializedWallet = new HDWallet();
    expect(() => uninitializedWallet.toDbString()).toThrowError(
      "HDWallet has no mnemonic, xPriv or xPub to serialize"
    );
  });

  it("Get next index", () => {
    expect(getNextUnusedIndex(-1, [null, null, null])).toBe(0);
    expect(getNextUnusedIndex(-1, ["", null, null])).toBe(1);
    expect(getNextUnusedIndex(-1, ["", null, ""])).toBe(1);
    expect(getNextUnusedIndex(-1, ["", "", null])).toBe(2);
    expect(getNextUnusedIndex(-1, ["", "", ""])).toBe(3);

    expect(getNextUnusedIndex(0, [null, null, null])).toBe(0);
    expect(getNextUnusedIndex(1, [null, null, null])).toBe(1);
    expect(getNextUnusedIndex(2, [null, null, null])).toBe(2);

    expect(
      getNextUnusedIndex(-1, [
        "759933dd4c6d75f097ec75158ebc04a1f89bc484fc6df0352816328fb4f533a4",
        null,
        null,
        null,
      ])
    ).toBe(1);
  });

  it("promises", async () => {
    const result = await Promise.all([
      (async () => 1)(),
      new Promise((resolve) => resolve(2)),
    ]);
    expect(stringify(result)).toBe(stringify([1, 2]));
  });

  it("deposit indexes", async () => {
    const hdWallet = await RegTestHDWallet.newRandom();
    expect(hdWallet.depositIndex).toBe(0);

    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    );

    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(0),
      value: 100000n,
    });
    expect(hdWallet.depositIndex).toBe(1);

    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(1),
      value: 100000n,
    });
    expect(hdWallet.depositIndex).toBe(2);

    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(4),
      value: 100000n,
    });
    expect(hdWallet.depositIndex).toBe(5);

    // beyond gap size, should not update index
    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(30),
      value: 100000n,
    });
    expect(hdWallet.depositIndex).toBe(5);

    await hdWallet.scanMoreAddresses(30);
    expect(hdWallet.depositIndex).toBe(31);
  });

  it("Should send funds from an HDWallet", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    );

    const hdWallet = await RegTestHDWallet.newRandom();
    expect(await hdWallet.getBalance("sat")).toBe(0n);

    const depositAddress = hdWallet.getDepositAddress();
    await fundingWallet.send({
      cashaddr: depositAddress,
      value: 100000n,
    });

    expect(await hdWallet.getBalance("sat")).toBe(100000n);

    const depositAddress2 = hdWallet.getDepositAddress();
    expect(depositAddress).not.toBe(depositAddress2);

    // send more funds to new deposit address
    await fundingWallet.send({
      cashaddr: depositAddress2,
      value: 100000n,
    });

    expect(await hdWallet.getBalance("sat")).toBe(200000n);

    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getDepositAddress(0))
      ).getBalance("sat")
    ).toBe(100000n);
    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getDepositAddress(1))
      ).getBalance("sat")
    ).toBe(100000n);
    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getDepositAddress(2))
      ).getBalance("sat")
    ).toBe(0n);

    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getChangeAddress(0))
      ).getBalance("sat")
    ).toBe(0n);

    const bob = await RegTestWallet.newRandom();

    await hdWallet.send({
      cashaddr: bob.getDepositAddress(),
      value: 150000n,
    });

    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getDepositAddress(0))
      ).getBalance("sat")
    ).toBe(0n);
    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getDepositAddress(1))
      ).getBalance("sat")
    ).toBe(0n);
    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getDepositAddress(2))
      ).getBalance("sat")
    ).toBe(0n);

    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getChangeAddress(0))
      ).getBalance("sat")
    ).toBeGreaterThan(50000n - 1000n);

    expect(hdWallet.getChangeAddress()).not.toBe(hdWallet.getChangeAddress(0));
    expect(hdWallet.getChangeAddress()).toBe(hdWallet.getChangeAddress(1));

    expect(hdWallet.depositIndex).toBe(2);
    expect(hdWallet.changeIndex).toBe(1);

    expect(await bob.getBalance("sat")).toBe(150000n);

    expect(await hdWallet.getBalance("sat")).toBe(49639n); // minus fees

    expect((await hdWallet.getMaxAmountToSend()).sat).toBe(49441n);
    const charlie = await RegTestWallet.newRandom();
    await hdWallet.sendMax(charlie.cashaddr);

    expect(await charlie.getBalance("sat")).toBe(49441n);
    expect(await hdWallet.getBalance("sat")).toBe(0n);
  });

  it("Should build unsigned transactions from an HDWallet", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    );

    const hdWallet = await RegTestHDWallet.newRandom();
    expect(await hdWallet.getBalance("sat")).toBe(0n);

    const depositAddress = hdWallet.getDepositAddress();
    await fundingWallet.send({
      cashaddr: depositAddress,
      value: 100000n,
    });

    expect(await hdWallet.getBalance("sat")).toBe(100000n);

    const unsignedTx = await hdWallet.send(
      {
        cashaddr: (await RegTestWallet.newRandom()).getDepositAddress(),
        value: 50000n,
      },
      {
        buildUnsigned: true,
      }
    );

    const tx = assertSuccess(
      decodeTransaction(hexToBin(unsignedTx.unsignedTransaction!))
    );
    expect(tx.inputs.length).toBe(1);
    expect(tx.inputs[0].unlockingBytecode.length).toBe(0); // should be empty
  });

  it("WalletCache persistence, addresses", async () => {
    const memoryCacheValue = Config.UseMemoryCache;
    Config.UseMemoryCache = true;

    const hdWallet = await RegTestHDWallet.newRandom();

    // get some addresses to populate cache
    hdWallet.getDepositAddress(0);
    hdWallet.getDepositAddress(100);

    hdWallet.getChangeAddress(0);
    hdWallet.getChangeAddress(100);

    // persist cache
    await hdWallet.walletCache.persist();

    // check cache data is there in other instance
    const otherWallet = await RegTestHDWallet.fromId(hdWallet.toDbString());
    expect(
      otherWallet.walletCache.get(hdWallet.getDepositAddress(0))
    ).toBeDefined();
    expect(
      otherWallet.walletCache.get(hdWallet.getDepositAddress(99))
    ).not.toBeDefined();
    expect(
      otherWallet.walletCache.get(hdWallet.getDepositAddress(100))
    ).toBeDefined();

    expect(
      otherWallet.walletCache.get(hdWallet.getChangeAddress(0))
    ).toBeDefined();
    expect(
      otherWallet.walletCache.get(hdWallet.getChangeAddress(99))
    ).not.toBeDefined();
    expect(
      otherWallet.walletCache.get(hdWallet.getChangeAddress(100))
    ).toBeDefined();

    Config.UseMemoryCache = memoryCacheValue;
  });

  it("WalletCache persistence, status and utxo", async () => {
    const memoryCacheValue = Config.UseMemoryCache;
    Config.UseMemoryCache = true;

    const hdWallet = await RegTestHDWallet.newRandom();

    // get some addresses to populate cache
    hdWallet.getDepositAddress(0);
    expect(
      hdWallet.walletCache.get(hdWallet.getDepositAddress(0))?.status
    ).toBeNull();

    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    );
    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(0),
      value: 100000n,
    });

    expect(
      hdWallet.walletCache.get(hdWallet.getDepositAddress(0))?.status
    ).not.toBeNull();
    expect(
      hdWallet.walletCache.get(hdWallet.getDepositAddress(0))?.utxos.length
    ).toBe(1);

    // persist cache
    await hdWallet.walletCache.persist();

    // check cache data is there in other instance
    const otherWallet = await RegTestHDWallet.fromId(hdWallet.toDbString());
    await otherWallet.watchPromise; // ensure any async init is done
    expect(
      otherWallet.walletCache.get(hdWallet.getDepositAddress(0))?.status
    ).not.toBeNull();
    expect(
      hdWallet.walletCache.get(hdWallet.getDepositAddress(0))?.utxos.length
    ).toBe(1);
    expect(
      stringify(hdWallet.walletCache.get(hdWallet.getDepositAddress(0))?.utxos)
    ).toBe(
      stringify(
        otherWallet.walletCache.get(hdWallet.getDepositAddress(0))?.utxos
      )
    );

    Config.UseMemoryCache = memoryCacheValue;
  });

  it("Cashtokens integration test", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    );
    const alice = await RegTestHDWallet.newRandom();
    await fundingWallet.send({
      cashaddr: alice.getDepositAddress(),
      value: 1000000n,
    });

    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.getDepositAddress(1),
      capability: NFTCapability.minting,
      commitment: "abcd",
      amount: 1000n,
    });

    const tokenId = genesisResponse.tokenIds![0];

    await new Promise((resolve) => setTimeout(resolve, 500));

    // mint 2 NFTs, amount reducing
    const response = await alice.tokenMint(tokenId, [
      new TokenMintRequest({
        cashaddr: alice.getDepositAddress(2),
        capability: NFTCapability.none,
        commitment: "",
      }),
      new TokenMintRequest({
        cashaddr: alice.getDepositAddress(3),
        capability: NFTCapability.mutable,
        commitment: "00",
      }),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const newTokenUtxos = await alice.getTokenUtxos(tokenId);
    expect(newTokenUtxos.length).toBe(3);
    expect(tokenId).toEqual(response.tokenIds![0]);

    const bob = await RegTestWallet.newRandom();
    await alice.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        tokenId: tokenId,
        capability: NFTCapability.minting,
        commitment: "abcd",
        amount: 1000n,
      }),
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        tokenId: tokenId,
        capability: NFTCapability.none,
        commitment: "",
      }),
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        tokenId: tokenId,
        capability: NFTCapability.mutable,
        commitment: "00",
      }),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect((await alice.getTokenUtxos(tokenId)).length).toBe(0);
    const bobTokenUtxos = await bob.getTokenUtxos(tokenId);
    expect(bobTokenUtxos.length).toBe(3);
    expect(tokenId).toEqual(response.tokenIds![0]);
  });

  test("Test enforcing token addresses", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    );
    const alice = await RegTestHDWallet.newRandom();
    await fundingWallet.send({
      cashaddr: alice.getDepositAddress(),
      value: 1000000n,
    });

    const genesisResponse = await alice.tokenGenesis({
      amount: 100n,
    });
    const tokenId = genesisResponse.tokenIds![0];

    await new Promise((resolve) => setTimeout(resolve, 500));

    const previousValue = Config.EnforceCashTokenReceiptAddresses;

    const wrap = (addr) => {
      return new Promise((resolve) => {
        resolve(new TokenSendRequest({ cashaddr: addr, tokenId: "" }));
      });
    };

    Config.EnforceCashTokenReceiptAddresses = false;
    await expect(wrap(alice.getDepositAddress())).resolves.not.toThrow();
    await expect(wrap(alice.getTokenDepositAddress())).resolves.not.toThrow();

    await expect(
      alice.send(
        new TokenSendRequest({
          cashaddr: alice.getDepositAddress(),
          tokenId: tokenId,
          amount: 1n,
        })
      )
    ).resolves.not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 500));

    await expect(
      alice.send(
        new TokenSendRequest({
          cashaddr: alice.getTokenDepositAddress(),
          tokenId: tokenId,
          amount: 2n,
        })
      )
    ).resolves.not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 500));

    Config.EnforceCashTokenReceiptAddresses = true;
    await expect(wrap(alice.getDepositAddress())).rejects.toThrow();
    await expect(wrap(alice.getTokenDepositAddress())).resolves.not.toThrow();

    await expect(
      (async () =>
        await alice.send(
          new TokenSendRequest({
            cashaddr: alice.getDepositAddress(),
            tokenId: tokenId,
            amount: 1n,
          })
        ))()
    ).rejects.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 500));

    await expect(
      alice.send(
        new TokenSendRequest({
          cashaddr: alice.getTokenDepositAddress(),
          tokenId: tokenId,
          amount: 2n,
        })
      )
    ).resolves.not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 500));

    Config.EnforceCashTokenReceiptAddresses = previousValue;
  });
});
