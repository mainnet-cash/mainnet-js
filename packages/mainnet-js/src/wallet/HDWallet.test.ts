import { assertSuccess, decodeTransaction, hexToBin } from "@bitauth/libauth";
import { stringify } from "../cache/index.js";
import { Config } from "../config.js";
import { NFTCapability } from "../interface.js";
import { mine } from "../mine/index.js";
import { disconnectProviders, initProviders } from "../network/Connection.js";
import { delay } from "../util/delay.js";
import { getNextUnusedIndex } from "../util/hd.js";
import { GAP_SIZE, HDWallet, RegTestHDWallet } from "./HDWallet.js";
import { CancelFn } from "./interface.js";
import { TokenMintRequest, TokenSendRequest } from "./model.js";
import { RegTestWallet, Wallet } from "./Wif.js";

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

const expectedXpub =
  "xpub6CGqRCnS5qDfyxtzV3y3tj8CY7qf3z3GiB2qnCUTdNkhpNxbLtobrU5ZXBVPG3rzPcBUpJAoj3K1u1jyDwKuduL71gLPm27Tckc85apgQRr";
const expectedXprv =
  "xprv9yHV1hFYFTfNmUpXP2S3XbBTz61AeXKRLx7Eyp4r53DiwadSoMVMJfm5fvtxBc3NFKfozcH42LM66Kb5VaxdLvGk43JWahCegx6iaEJbkB2";

describe("HDWallet", () => {
  it("should create a new HDWallet instance", async () => {
    const wallet = await Wallet.fromSeed(
      "divide battle bulb improve hockey favorite charge save merit fatal frog cage",
    );
    const walletSeed = await HDWallet.fromSeed(
      "divide battle bulb improve hockey favorite charge save merit fatal frog cage",
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

  it("should derive matching addresses from a depth-4 (change-level) wallet", async () => {
    // A wallet rooted at the change branch (depth 4) reaches the same N-th
    // address as the account wallet's deposit branch -- just by appending the
    // index (no branch component).
    const mnemonic =
      "divide battle bulb improve hockey favorite charge save merit fatal frog cage";

    const accountWallet = await HDWallet.fromSeed(mnemonic);
    expect(accountWallet.singleBranch).toBe(false);
    expect([...accountWallet.branches]).toEqual([0, 1]);

    const singleBranchWallet = await HDWallet.fromSeed(
      mnemonic,
      "m/44'/0'/0'/0",
    );
    expect(singleBranchWallet.singleBranch).toBe(true);
    expect([...singleBranchWallet.branches]).toEqual([0]);

    for (const i of [0, 1, 2, 3, 4, 5]) {
      expect(singleBranchWallet.getDepositAddress(i)).toBe(
        accountWallet.getDepositAddress(i),
      );
      expect(singleBranchWallet.getTokenDepositAddress(i)).toBe(
        accountWallet.getTokenDepositAddress(i),
      );
    }

    // Change branch is unreachable from a depth-4 root; the wallet collapses
    // change requests to the deposit branch.
    expect(singleBranchWallet.getChangeAddress(0)).toBe(
      singleBranchWallet.getDepositAddress(0),
    );
  });

  it("should track arbitrary integer branches via the `branches` option", async () => {
    const mnemonic =
      "divide battle bulb improve hockey favorite charge save merit fatal frog cage";
    const wallet = await Wallet.fromSeed(mnemonic);

    // The static helpers don't expose `branches`; reach into initialize().
    const w = new HDWallet();
    await (w as any).initialize({
      mnemonic,
      branches: [0, 1, 7],
    });

    expect([...w.branches]).toEqual([0, 1, 7]);
    // Branch 7 derives at m/44'/0'/0'/7/N -- distinct from branches 0/1.
    const b0 = w.getAddressByBranch(0, 0);
    const b1 = w.getAddressByBranch(1, 0);
    const b7 = w.getAddressByBranch(7, 0);
    expect(b0).not.toBe(b1);
    expect(b0).not.toBe(b7);
    expect(b1).not.toBe(b7);

    // Deposit/change conveniences map to branches 0 and 1.
    expect(w.getDepositAddress(0)).toBe(b0);
    expect(w.getChangeAddress(0)).toBe(b1);

    // Asking for an untracked branch throws.
    expect(() => w.getAddressByBranch(99, 0)).toThrow(/not tracked/);

    // The branch-0 address matches the standard single-key wallet derivation.
    expect(w.getDepositAddress(0)).toBe(wallet.cashaddr);
  });

  it("rejects an empty branches list", async () => {
    const w = new HDWallet();
    await expect((w as any).initialize({ branches: [] })).rejects.toThrow(
      /at least one/i,
    );
  });

  it("rejects construction from a depth-5 (address-level) node", async () => {
    // m/44'/0'/0'/0/0 is depth 5; the node can't derive further children.
    await expect(
      HDWallet.fromSeed(
        "divide battle bulb improve hockey favorite charge save merit fatal frog cage",
        "m/44'/0'/0'/0/0",
      ),
    ).rejects.toThrow(/too deep/i);
  });

  it("getChangeAddress falls back to deposit when branch 1 is not tracked", async () => {
    const mnemonic =
      "divide battle bulb improve hockey favorite charge save merit fatal frog cage";
    const w = new HDWallet();
    await (w as any).initialize({ mnemonic, branches: [0, 7] });

    expect(w.getChangeAddress(0)).toBe(w.getDepositAddress(0));
    expect(w.getChangeTokenAddress(0)).toBe(w.getTokenDepositAddress(0));
  });

  it("seeds per-branch indices from the `indices` constructor option", async () => {
    const mnemonic =
      "divide battle bulb improve hockey favorite charge save merit fatal frog cage";
    const w = new HDWallet();
    await (w as any).initialize({
      mnemonic,
      branches: [0, 1, 7],
      indices: { 0: 5, 7: 3 },
    });

    expect(w.indices.get(0)).toBe(5);
    expect(w.indices.get(1)).toBe(0); // not specified -- defaults to 0
    expect(w.indices.get(7)).toBe(3);
  });

  it("getTokenAddressByBranch yields token-prefixed addresses for arbitrary branches", async () => {
    const mnemonic =
      "divide battle bulb improve hockey favorite charge save merit fatal frog cage";
    const w = new HDWallet();
    await (w as any).initialize({ mnemonic, branches: [0, 1, 7] });

    const plain = w.getAddressByBranch(7, 0);
    const token = w.getTokenAddressByBranch(7, 0);
    expect(token).not.toBe(plain);
    // P2PKH uses the 'q' prefix; the token-aware variant uses 'z'.
    expect(plain.startsWith("bitcoincash:q")).toBe(true);
    expect(token.startsWith("bitcoincash:z")).toBe(true);
    // Untracked branch also throws on the token-address variant.
    expect(() => w.getTokenAddressByBranch(99, 0)).toThrow(/not tracked/);
  });

  it("toDbString for a depth-4 wallet round-trips into a single-branch wallet", async () => {
    const mnemonic =
      "divide battle bulb improve hockey favorite charge save merit fatal frog cage";
    const original = await HDWallet.fromSeed(mnemonic, "m/44'/0'/0'/0");
    expect(original.singleBranch).toBe(true);

    const dbString = original.toDbString();
    // hd:mainnet:<mnemonic>:<derivation>:<depositIdx>:<changeIdx>
    const parts = dbString.split(":");
    expect(parts[3]).toBe("m/44'/0'/0'/0");

    const restored = await HDWallet.fromId(dbString);
    expect(restored.singleBranch).toBe(true);
    expect([...restored.branches]).toEqual([0]);
    expect(restored.getDepositAddress(0)).toBe(original.getDepositAddress(0));
  });

  it("end-to-end: tracks a [0, 1, 7] wallet and filters utxos by branch", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );

    const w = new RegTestHDWallet();
    await (w as any).initialize({ branches: [0, 1, 7] });

    expect([...w.branches]).toEqual([0, 1, 7]);
    expect(w.indices.get(7)).toBe(0);

    // Fund the branch-7 address at index 0.
    await fundingWallet.send({
      cashaddr: w.getAddressByBranch(7, 0),
      value: 50_000n,
    });
    await w.waitForUpdate({ indices: { 7: 1 } });
    expect(w.indices.get(7)).toBe(1);

    // Default getUtxos returns funds from every tracked branch.
    const all = await w.getUtxos();
    expect(all.some((u) => u.satoshis === 50_000n)).toBe(true);

    // Filter to branch 7 only.
    const justSeven = await w.getUtxos({ branches: [7] });
    expect(justSeven.length).toBe(1);
    expect(justSeven[0].satoshis).toBe(50_000n);

    // Branches 0 and 1 are empty.
    expect((await w.getUtxos({ branches: [0] })).length).toBe(0);
    expect((await w.getUtxos({ branches: [1] })).length).toBe(0);

    // Balance filtering matches.
    expect(await w.getBalance({ branches: [7] })).toBe(50_000n);
    expect(await w.getBalance({ branches: [0, 1] })).toBe(0n);

    // Empty filter throws.
    await expect(w.getUtxos({ branches: [] })).rejects.toThrow(/empty/i);

    // Untracked branch throws.
    await expect(w.getUtxos({ branches: [99] })).rejects.toThrow(
      /not tracked/i,
    );
  });

  it("end-to-end: a depth-4 wallet advances its single branch on receipt", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );

    const seedWallet = await RegTestHDWallet.newRandom();
    const w = await RegTestHDWallet.fromSeed(
      seedWallet.mnemonic!,
      "m/44'/0'/0'/0",
    );
    expect(w.singleBranch).toBe(true);
    expect([...w.branches]).toEqual([0]);

    await fundingWallet.send({
      cashaddr: w.getDepositAddress(0),
      value: 30_000n,
    });
    await w.waitForUpdate({ depositIndex: 1 });

    expect(w.indices.get(0)).toBe(1);
    expect(await w.getBalance()).toBe(30_000n);

    // Branch 1 isn't tracked on a depth-4 wallet; filtering rejects it.
    await expect(w.getBalance({ branches: [1] })).rejects.toThrow(
      /not tracked/i,
    );
  });

  it("should serialize", async () => {
    const wallet = await HDWallet.fromSeed(
      "divide battle bulb improve hockey favorite charge save merit fatal frog cage",
    );
    expect(wallet.toString()).toBe(
      "hd:mainnet:divide battle bulb improve hockey favorite charge save merit fatal frog cage:m/44'/0'/0':0:0",
    );
    expect(wallet.toDbString()).toBe(
      "hd:mainnet:divide battle bulb improve hockey favorite charge save merit fatal frog cage:m/44'/0'/0':0:0",
    );

    wallet.name = "testWallet";
    expect(wallet.toString()).toBe("named:mainnet:testWallet");
    expect(wallet.toDbString()).toBe(
      "hd:mainnet:divide battle bulb improve hockey favorite charge save merit fatal frog cage:m/44'/0'/0':0:0",
    );

    const xPrivWallet = await HDWallet.fromXPriv(expectedXprv);
    expect(xPrivWallet.toString()).toBe(
      "hd:mainnet:xprv9yHV1hFYFTfNmUpXP2S3XbBTz61AeXKRLx7Eyp4r53DiwadSoMVMJfm5fvtxBc3NFKfozcH42LM66Kb5VaxdLvGk43JWahCegx6iaEJbkB2:0:0",
    );

    const xPubWallet = await HDWallet.fromXPub(expectedXpub);
    expect(xPubWallet.toString()).toBe(
      "hd:mainnet:xpub6CGqRCnS5qDfyxtzV3y3tj8CY7qf3z3GiB2qnCUTdNkhpNxbLtobrU5ZXBVPG3rzPcBUpJAoj3K1u1jyDwKuduL71gLPm27Tckc85apgQRr:0:0",
    );

    const uninitializedWallet = new HDWallet();
    expect(() => uninitializedWallet.toDbString()).toThrowError(
      "HDWallet has no mnemonic, xPriv or xPub to serialize",
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
      ]),
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
    expect(hdWallet.indices.get(0)!).toBe(0);

    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );

    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(0),
      value: 100000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: 1 });
    expect(hdWallet.indices.get(0)!).toBe(1);

    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(1),
      value: 100000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: 2 });
    expect(hdWallet.indices.get(0)!).toBe(2);

    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(4),
      value: 100000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: 5 });
    expect(hdWallet.indices.get(0)!).toBe(5);

    // beyond gap size, should not update index
    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(30),
      value: 100000n,
    });
    expect(hdWallet.indices.get(0)!).toBe(5);

    await hdWallet.scanMoreAddresses(30);
    expect(hdWallet.indices.get(0)!).toBe(31);
  });

  it("should scan beyond gap to find real deposit index", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );

    // Create a wallet and fund addresses 0 and 20
    // Initial scan covers 0-19, finds addr 0 used (depositIndex=1)
    // Gap from index 1 to end of scan (19) is 19 < 20, so scanner extends
    // Next batch includes addr 20, finds it used (depositIndex=21)
    const seedWallet = await RegTestHDWallet.newRandom();
    const addr0 = seedWallet.getDepositAddress(0);
    const addr20 = seedWallet.getDepositAddress(20);

    await fundingWallet.send([
      { cashaddr: addr0, value: 10000n },
      { cashaddr: addr20, value: 10000n },
    ]);
    // Wait for seedWallet to see both transactions via electrum
    await seedWallet.waitForUpdate({ depositIndex: 21 });

    // Restore wallet from same seed, starting from index 0
    const restoredWallet = await RegTestHDWallet.fromSeed(
      seedWallet.mnemonic!,
      seedWallet.derivation,
    );
    await restoredWallet.watchPromise;

    expect(restoredWallet.indices.get(0)!).toBe(21);
  });

  it("changeIndex updates when spending", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );
    const hdWallet = await RegTestHDWallet.newRandom();
    const bob = await RegTestWallet.newRandom();

    expect(hdWallet.indices.get(0)!).toBe(0);
    expect(hdWallet.indices.get(1)!).toBe(0);

    // fund deposit address 0
    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(0),
      value: 100000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: 1 });
    expect(hdWallet.indices.get(0)!).toBe(1);
    expect(hdWallet.indices.get(1)!).toBe(0);

    // spend, which creates change on change address 0
    await hdWallet.send({
      cashaddr: bob.getDepositAddress(),
      value: 50000n,
    });
    await hdWallet.waitForUpdate({ changeIndex: 1 });
    expect(hdWallet.indices.get(1)!).toBe(1);

    // fund and spend again, change goes to change address 1
    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(),
      value: 100000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: 2 });
    await hdWallet.send({
      cashaddr: bob.getDepositAddress(),
      value: 50000n,
    });
    await hdWallet.waitForUpdate({ changeIndex: 2 });
    expect(hdWallet.indices.get(1)!).toBe(2);

    // Restore wallet from same seed and verify depositIndex is correct
    const restoredWallet = await RegTestHDWallet.fromSeed(
      hdWallet.mnemonic!,
      hdWallet.derivation,
    );
    await restoredWallet.watchPromise;

    expect(restoredWallet.indices.get(0)!).toBe(hdWallet.indices.get(0)!);
    expect(restoredWallet.indices.get(1)!).toBe(hdWallet.indices.get(1)!);
  });

  it("hasAddress should recognize wallet addresses", async () => {
    const hdWallet = await RegTestHDWallet.newRandom();

    const deposit0 = hdWallet.getDepositAddress(0);
    const deposit1 = hdWallet.getDepositAddress(1);
    const change0 = hdWallet.getChangeAddress(0);

    expect(hdWallet.hasAddress(deposit0)).toBe(true);
    expect(hdWallet.hasAddress(deposit1)).toBe(true);
    expect(hdWallet.hasAddress(change0)).toBe(true);
    expect(
      hdWallet.hasAddress("bchreg:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9d5dxv4"),
    ).toBe(false);
  });

  it("Should send funds from an HDWallet", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );

    const hdWallet = await RegTestHDWallet.newRandom();
    expect(await hdWallet.getBalance()).toBe(0n);

    const depositAddress = hdWallet.getDepositAddress();
    await fundingWallet.send({
      cashaddr: depositAddress,
      value: 100000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: 1 });

    expect(await hdWallet.getBalance()).toBe(100000n);

    const depositAddress2 = hdWallet.getDepositAddress();
    expect(depositAddress).not.toBe(depositAddress2);

    // send more funds to new deposit address
    await fundingWallet.send({
      cashaddr: depositAddress2,
      value: 100000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: 2 });

    expect(await hdWallet.getBalance()).toBe(200000n);

    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getDepositAddress(0))
      ).getBalance(),
    ).toBe(100000n);
    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getDepositAddress(1))
      ).getBalance(),
    ).toBe(100000n);
    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getDepositAddress(2))
      ).getBalance(),
    ).toBe(0n);

    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getChangeAddress(0))
      ).getBalance(),
    ).toBe(0n);

    const bob = await RegTestWallet.newRandom();

    await hdWallet.send({
      cashaddr: bob.getDepositAddress(),
      value: 150000n,
    });
    await hdWallet.waitForUpdate({ changeIndex: 1 });

    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getDepositAddress(0))
      ).getBalance(),
    ).toBe(0n);
    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getDepositAddress(1))
      ).getBalance(),
    ).toBe(0n);
    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getDepositAddress(2))
      ).getBalance(),
    ).toBe(0n);

    expect(
      await (
        await RegTestWallet.watchOnly(hdWallet.getChangeAddress(0))
      ).getBalance(),
    ).toBeGreaterThan(50000n - 1000n);

    expect(hdWallet.getChangeAddress()).not.toBe(hdWallet.getChangeAddress(0));
    expect(hdWallet.getChangeAddress()).toBe(hdWallet.getChangeAddress(1));

    expect(hdWallet.indices.get(0)!).toBe(2);
    expect(hdWallet.indices.get(1)!).toBe(1);

    expect(await bob.getBalance()).toBe(150000n);

    expect(await hdWallet.getBalance()).toBe(49639n); // minus fees

    expect(await hdWallet.getMaxAmountToSend()).toBe(49407n);
    const charlie = await RegTestWallet.newRandom();
    await hdWallet.sendMax(charlie.cashaddr);

    // Wait for HD wallet to process the spent notification
    while ((await hdWallet.getBalance()) > 0n)
      await new Promise((r) => setTimeout(r, 50));

    expect(await charlie.getBalance()).toBe(49407n);
    expect(await hdWallet.getBalance()).toBe(0n);
  });

  it("Should build unsigned transactions from an HDWallet", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );

    const hdWallet = await RegTestHDWallet.newRandom();
    expect(await hdWallet.getBalance()).toBe(0n);

    const depositAddress = hdWallet.getDepositAddress();
    await fundingWallet.send({
      cashaddr: depositAddress,
      value: 100000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: 1 });

    expect(await hdWallet.getBalance()).toBe(100000n);

    const unsignedTx = await hdWallet.send(
      {
        cashaddr: (await RegTestWallet.newRandom()).getDepositAddress(),
        value: 50000n,
      },
      {
        buildUnsigned: true,
      },
    );

    const tx = assertSuccess(
      decodeTransaction(hexToBin(unsignedTx.unsignedTransaction!)),
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
    await hdWallet.walletCache.persist(true);

    // check cache data is there in other instance
    const otherWallet = await RegTestHDWallet.fromId(hdWallet.toDbString());
    expect(
      otherWallet.walletCache.get(hdWallet.getDepositAddress(0))
        ?.privateKey instanceof Uint8Array,
    ).toBe(true);
    expect(
      otherWallet.walletCache.get(hdWallet.getDepositAddress(0))
        ?.publicKey instanceof Uint8Array,
    ).toBe(true);
    expect(
      otherWallet.walletCache.get(hdWallet.getDepositAddress(0))
        ?.publicKeyHash instanceof Uint8Array,
    ).toBe(true);

    expect(
      otherWallet.walletCache.get(hdWallet.getDepositAddress(0)),
    ).toBeDefined();
    expect(
      otherWallet.walletCache.get(hdWallet.getDepositAddress(99)),
    ).not.toBeDefined();
    expect(
      otherWallet.walletCache.get(hdWallet.getDepositAddress(100)),
    ).toBeDefined();

    expect(
      otherWallet.walletCache.get(hdWallet.getChangeAddress(0)),
    ).toBeDefined();
    expect(
      otherWallet.walletCache.get(hdWallet.getChangeAddress(99)),
    ).not.toBeDefined();
    expect(
      otherWallet.walletCache.get(hdWallet.getChangeAddress(100)),
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
      hdWallet.walletCache.get(hdWallet.getDepositAddress(0))?.status,
    ).toBeNull();

    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );
    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(0),
      value: 100000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: 1 });

    expect(
      hdWallet.walletCache.get(hdWallet.getDepositAddress(0))?.status,
    ).not.toBeNull();
    expect(
      hdWallet.walletCache.get(hdWallet.getDepositAddress(0))?.utxos.length,
    ).toBe(1);

    // persist cache
    await hdWallet.walletCache.persist(true);

    // check cache data is there in other instance
    const otherWallet = await RegTestHDWallet.fromId(hdWallet.toDbString());
    await otherWallet.watchPromise; // ensure any async init is done
    expect(
      otherWallet.walletCache.get(hdWallet.getDepositAddress(0))?.status,
    ).not.toBeNull();
    expect(
      hdWallet.walletCache.get(hdWallet.getDepositAddress(0))?.utxos.length,
    ).toBe(1);
    expect(
      stringify(hdWallet.walletCache.get(hdWallet.getDepositAddress(0))?.utxos),
    ).toBe(
      stringify(
        otherWallet.walletCache.get(hdWallet.getDepositAddress(0))?.utxos,
      ),
    );

    Config.UseMemoryCache = memoryCacheValue;
  });

  it("WalletCache persistence, rawHistory", async () => {
    const memoryCacheValue = Config.UseMemoryCache;
    Config.UseMemoryCache = true;

    const hdWallet = await RegTestHDWallet.newRandom();

    // get deposit address to populate cache
    hdWallet.getDepositAddress(0);
    expect(
      hdWallet.walletCache.get(hdWallet.getDepositAddress(0))?.rawHistory,
    ).toEqual([]);

    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );
    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(0),
      value: 100000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: 1 });

    // rawHistory should now have one entry
    expect(
      hdWallet.walletCache.get(hdWallet.getDepositAddress(0))?.rawHistory
        .length,
    ).toBe(1);

    // persist cache
    await hdWallet.walletCache.persist(true);

    // check cache data is there in other instance
    const otherWallet = await RegTestHDWallet.fromId(hdWallet.toDbString());
    await otherWallet.watchPromise;
    expect(
      otherWallet.walletCache.get(hdWallet.getDepositAddress(0))?.rawHistory
        .length,
    ).toBe(1);
    expect(
      stringify(
        hdWallet.walletCache.get(hdWallet.getDepositAddress(0))?.rawHistory,
      ),
    ).toBe(
      stringify(
        otherWallet.walletCache.get(hdWallet.getDepositAddress(0))?.rawHistory,
      ),
    );

    Config.UseMemoryCache = memoryCacheValue;
  });

  it("getRawHistory uses cached data", async () => {
    const hdWallet = await RegTestHDWallet.newRandom();

    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );

    // Send to multiple deposit addresses
    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(0),
      value: 100000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: 1 });

    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(1),
      value: 100000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: 2 });

    // Check branch-0 per-address raw-history arrays are populated.
    expect(hdWallet.rawHistory.get(0)![0].length).toBe(1);
    expect(hdWallet.rawHistory.get(0)![1].length).toBe(1);

    // getRawHistory should return deduplicated history from cache
    const rawHistory = await hdWallet.getRawHistory();
    expect(rawHistory.length).toBe(2);

    // Verify history items have expected structure
    expect(rawHistory[0]).toHaveProperty("tx_hash");
    expect(rawHistory[0]).toHaveProperty("height");
  });

  it("getHistory works with cached rawHistory", async () => {
    const hdWallet = await RegTestHDWallet.newRandom();

    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );

    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(0),
      value: 100000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: 1 });

    const history = await hdWallet.getHistory({ unit: "sat" });
    expect(history.length).toBe(1);
    expect(history[0].valueChange).toBe(100000);
  });

  it("incremental history fetching with lastConfirmedHeight", async () => {
    const memoryCacheValue = Config.UseMemoryCache;
    Config.UseMemoryCache = true;

    const hdWallet = await RegTestHDWallet.newRandom();

    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );

    // First transaction
    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(0),
      value: 50000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: 1 });

    // Check rawHistory is populated
    const cacheEntry1 = hdWallet.walletCache.get(hdWallet.getDepositAddress(0));
    expect(cacheEntry1?.rawHistory.length).toBe(1);
    // lastConfirmedHeight may be 0 if tx is unconfirmed
    expect(cacheEntry1?.lastConfirmedHeight).toBeGreaterThanOrEqual(0);

    // Second transaction to same address
    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(0),
      value: 60000n,
    });
    while (hdWallet.rawHistory.get(0)![0].length < 2)
      await new Promise((r) => setTimeout(r, 50));

    // Check history accumulated correctly
    const cacheEntry2 = hdWallet.walletCache.get(hdWallet.getDepositAddress(0));
    expect(cacheEntry2?.rawHistory.length).toBe(2);

    // Verify getRawHistory returns both transactions
    const rawHistory = await hdWallet.getRawHistory();
    expect(rawHistory.length).toBe(2);

    // Persist and reload - cache should be preserved
    await hdWallet.walletCache.persist(true);
    const otherWallet = await RegTestHDWallet.fromId(hdWallet.toDbString());
    await otherWallet.watchPromise;

    const reloadedEntry = otherWallet.walletCache.get(
      hdWallet.getDepositAddress(0),
    );
    expect(reloadedEntry?.lastConfirmedHeight).toBe(
      cacheEntry2?.lastConfirmedHeight,
    );
    expect(reloadedEntry?.rawHistory.length).toBe(2);

    Config.UseMemoryCache = memoryCacheValue;
  });

  it("watchWallet registers and removes callbacks", async () => {
    const hdWallet = await RegTestHDWallet.newRandom();

    const cancel = await hdWallet.watchStatus(() => {});

    // Verify callback was registered
    expect((hdWallet as any).walletWatchCallbacks.length).toBe(1);

    // Cancel
    await cancel();

    // Verify callback was removed
    expect((hdWallet as any).walletWatchCallbacks.length).toBe(0);
  });

  it("waitForUpdate resolves via timeout when depositIndex target is not reached", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );
    const hdWallet = await RegTestHDWallet.newRandom();
    expect(hdWallet.indices.get(0)!).toBe(0);

    // No transaction sent - idle timer should resolve without hanging
    await hdWallet.waitForUpdate({ depositIndex: 1 });

    // depositIndex is still 0 because no funds arrived
    expect(hdWallet.indices.get(0)!).toBe(0);

    // No leftover watchers
    expect((hdWallet as any).walletWatchCallbacks.length).toBe(0);

    // Now send a real transaction - waitForUpdate should resolve once index advances
    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(0),
      value: 100000n,
    });
    await hdWallet.waitForUpdate();

    expect(hdWallet.indices.get(0)!).toBe(1);
    expect((hdWallet as any).walletWatchCallbacks.length).toBe(0);
  });

  it("watchWallet supports multiple watchers", async () => {
    const hdWallet = await RegTestHDWallet.newRandom();

    const cancel1 = await hdWallet.watchStatus(() => {});
    const cancel2 = await hdWallet.watchStatus(() => {});

    // Verify both callbacks registered
    expect((hdWallet as any).walletWatchCallbacks.length).toBe(2);

    // Cancel one watcher
    await cancel1();
    expect((hdWallet as any).walletWatchCallbacks.length).toBe(1);

    await cancel2();
    expect((hdWallet as any).walletWatchCallbacks.length).toBe(0);
  });

  it("watchWalletBalance sets up callback correctly", async () => {
    const hdWallet = await RegTestHDWallet.newRandom();

    const cancel = await hdWallet.watchBalance(() => {});

    // Verify callback was registered via watchWallet
    expect((hdWallet as any).walletWatchCallbacks.length).toBe(1);

    await cancel();
    expect((hdWallet as any).walletWatchCallbacks.length).toBe(0);
  });

  it("watchWalletTransactions sets up callback correctly", async () => {
    const hdWallet = await RegTestHDWallet.newRandom();

    const cancel = await hdWallet.watchTransactions(() => {});

    // Verify callback was registered via watchWallet
    expect((hdWallet as any).walletWatchCallbacks.length).toBe(1);

    await cancel();
    expect((hdWallet as any).walletWatchCallbacks.length).toBe(0);
  });

  it("Cashtokens integration test", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );
    const alice = await RegTestHDWallet.newRandom();
    await fundingWallet.send({
      cashaddr: alice.getDepositAddress(),
      value: 1000000n,
    });
    await alice.waitForUpdate({ depositIndex: 1 });

    const genesisResponse = await alice.tokenGenesis({
      cashaddr: alice.getDepositAddress(1),
      nft: {
        capability: NFTCapability.minting,
        commitment: "abcd",
      },
      amount: 1000n,
    });

    const category = genesisResponse.categories![0];

    await new Promise((resolve) => setTimeout(resolve, 500));

    // mint 2 NFTs, amount reducing
    const response = await alice.tokenMint([
      new TokenMintRequest({
        category: category,
        cashaddr: alice.getDepositAddress(2),
        nft: {
          capability: NFTCapability.none,
          commitment: "",
        },
      }),
      new TokenMintRequest({
        category: category,
        cashaddr: alice.getDepositAddress(3),
        nft: {
          capability: NFTCapability.mutable,
          commitment: "00",
        },
      }),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const newTokenUtxos = await alice.getTokenUtxos(category);
    expect(newTokenUtxos.length).toBe(3);
    expect(category).toEqual(response.categories![0]);

    const bob = await RegTestWallet.newRandom();
    await alice.send([
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        category: category,
        nft: {
          capability: NFTCapability.minting,
          commitment: "abcd",
        },
        amount: 1000n,
      }),
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        category: category,
        nft: {
          capability: NFTCapability.none,
          commitment: "",
        },
      }),
      new TokenSendRequest({
        cashaddr: bob.cashaddr!,
        category: category,
        nft: {
          capability: NFTCapability.mutable,
          commitment: "00",
        },
      }),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect((await alice.getTokenUtxos(category)).length).toBe(0);
    const bobTokenUtxos = await bob.getTokenUtxos(category);
    expect(bobTokenUtxos.length).toBe(3);
    expect(category).toEqual(response.categories![0]);
  });

  test("Test enforcing token addresses", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );
    const alice = await RegTestHDWallet.newRandom();
    await fundingWallet.send({
      cashaddr: alice.getDepositAddress(),
      value: 1000000n,
    });
    await alice.waitForUpdate({ depositIndex: 1 });

    const genesisResponse = await alice.tokenGenesis({
      amount: 100n,
    });
    const category = genesisResponse.categories![0];

    await new Promise((resolve) => setTimeout(resolve, 500));

    const previousValue = Config.EnforceCashTokenReceiptAddresses;

    const wrap = (addr) => {
      return new Promise((resolve) => {
        resolve(new TokenSendRequest({ cashaddr: addr, category: "" }));
      });
    };

    Config.EnforceCashTokenReceiptAddresses = false;
    await expect(wrap(alice.getDepositAddress())).resolves.not.toThrow();
    await expect(wrap(alice.getTokenDepositAddress())).resolves.not.toThrow();

    await expect(
      alice.send(
        new TokenSendRequest({
          cashaddr: alice.getDepositAddress(),
          category: category,
          amount: 1n,
        }),
      ),
    ).resolves.not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 500));

    await expect(
      alice.send(
        new TokenSendRequest({
          cashaddr: alice.getTokenDepositAddress(),
          category: category,
          amount: 2n,
        }),
      ),
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
            category: category,
            amount: 1n,
          }),
        ))(),
    ).rejects.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 500));

    await expect(
      alice.send(
        new TokenSendRequest({
          cashaddr: alice.getTokenDepositAddress(),
          category: category,
          amount: 2n,
        }),
      ),
    ).resolves.not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 500));

    Config.EnforceCashTokenReceiptAddresses = previousValue;
  });

  it("watchTransactionHashes reports new transactions on HD wallet", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );
    const hdWallet = await RegTestHDWallet.newRandom();

    // Fund the HD wallet at deposit address 0
    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(0),
      value: 100000n,
    });
    await mine({ cashaddr: hdWallet.getDepositAddress(0), blocks: 1 });
    await delay(2000);

    // Set up watchTransactionHashes, collect reported tx hashes
    const reportedHashes: string[] = [];
    let cancelWatch: CancelFn;
    cancelWatch = await hdWallet.watchTransactionHashes((txHash) => {
      reportedHashes.push(txHash);
    });

    // Wait for initial callback to fire with existing tx
    await delay(2000);

    // Send a new transaction to the HD wallet
    const sendResponse = await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(),
      value: 50000n,
    });
    await mine({ cashaddr: hdWallet.getDepositAddress(0), blocks: 1 });
    await delay(2000);

    await cancelWatch();

    // The new transaction's txId should appear in collected hashes
    expect(reportedHashes).toContain(sendResponse.txId);
  });

  it("watchTransactionHashes does not re-report old transactions", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );
    const hdWallet = await RegTestHDWallet.newRandom();

    // Start watching before any transactions so the first funding triggers a callback
    const reportedHashes: string[] = [];
    let cancelWatch: CancelFn;
    cancelWatch = await hdWallet.watchTransactionHashes((txHash) => {
      reportedHashes.push(txHash);
    });

    // Fund the HD wallet at deposit address 0
    const fundResponse = await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(0),
      value: 100000n,
    });
    await mine({ cashaddr: hdWallet.getDepositAddress(0), blocks: 1 });
    await delay(2000);

    // Record how many hashes reported so far (the initial set)
    const initialCount = reportedHashes.length;
    expect(reportedHashes).toContain(fundResponse.txId);
    const initialHashes = [...reportedHashes];

    // Send a second transaction to the HD wallet
    const sendResponse2 = await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(),
      value: 50000n,
    });
    await mine({ cashaddr: hdWallet.getDepositAddress(0), blocks: 1 });
    await delay(2000);

    await cancelWatch();

    // Hashes reported after the initial set
    const laterHashes = reportedHashes.slice(initialCount);

    // The second tx hash was reported
    expect(laterHashes).toContain(sendResponse2.txId);

    // None of the initial tx hashes were reported again after the first callback
    for (const hash of initialHashes) {
      expect(laterHashes).not.toContain(hash);
    }
  });

  it("watchTransactionHashes handles transactions across multiple deposit addresses", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );
    const hdWallet = await RegTestHDWallet.newRandom();

    // Fund deposit address 0
    const fund0Response = await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(0),
      value: 100000n,
    });
    await mine({ cashaddr: hdWallet.getDepositAddress(0), blocks: 1 });
    await delay(1000);

    // Fund deposit address 1
    const fund1Response = await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(1),
      value: 100000n,
    });
    await mine({ cashaddr: hdWallet.getDepositAddress(0), blocks: 1 });
    await delay(1000);

    // depositIndex should be 2
    expect(hdWallet.indices.get(0)!).toBe(2);

    // Set up watchTransactionHashes, collect all reported hashes
    const reportedHashes: string[] = [];
    let cancelWatch: CancelFn;
    cancelWatch = await hdWallet.watchTransactionHashes((txHash) => {
      reportedHashes.push(txHash);
    });

    // Wait for initial callback to fire
    await delay(2000);

    // Send a new transaction to the wallet's next deposit address
    const fund2Response = await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(),
      value: 50000n,
    });
    await mine({ cashaddr: hdWallet.getDepositAddress(0), blocks: 1 });
    await delay(2000);

    await cancelWatch();

    // All 3 tx hashes appear in the collected output
    expect(reportedHashes).toContain(fund0Response.txId);
    expect(reportedHashes).toContain(fund1Response.txId);
    expect(reportedHashes).toContain(fund2Response.txId);

    // Each tx hash appears exactly once
    const uniqueHashes = new Set(reportedHashes);
    expect(uniqueHashes.size).toBe(reportedHashes.length);
  });

  it("gap is maintained when addresses near the edge are used", async () => {
    const fundingWallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6",
    );
    const hdWallet = await RegTestHDWallet.newRandom();
    await hdWallet.watchPromise;

    // Initially: depositIndex=0, watched addresses 0..(GAP_SIZE-1)
    expect(hdWallet.indices.get(0)!).toBe(0);
    const initialWatched = (hdWallet as any).statuses.get(0)!.length;
    expect(initialWatched).toBe(GAP_SIZE);

    // Fund an address near the edge of the gap
    const edgeIndex = GAP_SIZE - 2;
    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(edgeIndex),
      value: 10000n,
    });

    // Wait for the subscription callback to fire and gap extension to complete
    await hdWallet.waitForUpdate({ depositIndex: edgeIndex + 1 });
    await delay(1000);

    // depositIndex should have advanced
    expect(hdWallet.indices.get(0)!).toBe(edgeIndex + 1);

    // The watched range should have extended to maintain the gap
    const newWatched = (hdWallet as any).statuses.get(0)!.length;
    expect(newWatched).toBeGreaterThanOrEqual(
      hdWallet.indices.get(0)! + GAP_SIZE,
    );

    // Verify the new addresses are actually subscribed (watchCancels populated)
    const watchCancels = (hdWallet as any).watchCancels.get(0)!;
    for (let i = initialWatched; i < newWatched; i++) {
      expect(watchCancels[i]).toBeDefined();
    }

    // Fund an address in the newly extended range to prove it's being watched
    const newEdge = newWatched - 2;
    await fundingWallet.send({
      cashaddr: hdWallet.getDepositAddress(newEdge),
      value: 10000n,
    });
    await hdWallet.waitForUpdate({ depositIndex: newEdge + 1 });
    await delay(1000);

    expect(hdWallet.indices.get(0)!).toBe(newEdge + 1);

    // Gap should still be maintained after the second extension
    const finalWatched = (hdWallet as any).statuses.get(0)!.length;
    expect(finalWatched).toBeGreaterThanOrEqual(
      hdWallet.indices.get(0)! + GAP_SIZE,
    );
  });
});
