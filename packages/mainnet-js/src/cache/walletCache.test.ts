import {
  assertSuccess,
  decodeHdPublicKey,
  deriveHdPath,
  deriveHdPrivateNodeFromBip39Mnemonic,
  deriveHdPublicNode,
  encodeHdPublicKey,
} from "@bitauth/libauth";

import { Config } from "../config.js";
import { HDWalletCache } from "./walletCache.js";

const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

function xpubAt(path: string): string {
  const root = deriveHdPrivateNodeFromBip39Mnemonic(MNEMONIC);
  const priv = deriveHdPath(root, path);
  if (typeof priv === "string") throw new Error(priv);
  const pub = deriveHdPublicNode(priv);
  return assertSuccess(encodeHdPublicKey({ node: pub, network: "mainnet" }))
    .hdPublicKey;
}

function publicNodeOf(xpub: string) {
  const decoded = decodeHdPublicKey(xpub);
  if (typeof decoded === "string") throw new Error(decoded);
  return decoded.node;
}

const ACCOUNT_PATH = "m/44'/145'/0'"; // depth 3
const CHANGE_PATH = "m/44'/145'/0'/0"; // depth 4 (external branch)

describe("HDWalletCache", () => {
  test("getByPath derives at the given relative path and caches the result", () => {
    const cache = new HDWalletCache(
      "wallet-acc",
      publicNodeOf(xpubAt(ACCOUNT_PATH)),
      "bitcoincash",
    );
    const first = cache.getByPath("0/0");
    const second = cache.getByPath("0/0");
    expect(second).toBe(first); // cached -- same reference

    const other = cache.getByPath("0/1");
    expect(other.address).not.toBe(first.address);
  });

  test("getByIndex is a wrapper around getByPath with the standard convention", () => {
    const cache = new HDWalletCache(
      "wallet-acc",
      publicNodeOf(xpubAt(ACCOUNT_PATH)),
      "bitcoincash",
    );
    expect(cache.getByIndex(0, 0).address).toBe(cache.getByPath("0/0").address);
    expect(cache.getByIndex(3, 1).address).toBe(cache.getByPath("1/3").address);
  });

  test("paths beyond branches 0/1 derive distinct addresses (N-branch support)", () => {
    const cache = new HDWalletCache(
      "wallet-acc",
      publicNodeOf(xpubAt(ACCOUNT_PATH)),
      "bitcoincash",
    );
    const b0 = cache.getByPath("0/0").address;
    const b1 = cache.getByPath("1/0").address;
    const b7 = cache.getByPath("7/0").address;
    expect(b0).not.toBe(b1);
    expect(b0).not.toBe(b7);
    expect(b1).not.toBe(b7);
  });

  test("the cache is depth-agnostic: a depth-4 XPub derives by bare index", () => {
    const accountCache = new HDWalletCache(
      "wallet-acc",
      publicNodeOf(xpubAt(ACCOUNT_PATH)),
      "bitcoincash",
    );
    const changeCache = new HDWalletCache(
      "wallet-chg",
      publicNodeOf(xpubAt(CHANGE_PATH)),
      "bitcoincash",
    );

    // The caller (HDWallet) chooses the path. At depth 4 the caller asks for
    // the bare index; at depth 3 it prefixes with the branch.
    for (const i of [0, 1, 5, 19]) {
      const fromAccount = accountCache.getByPath(`0/${i}`).address;
      const fromChange = changeCache.getByPath(`${i}`).address;
      expect(fromChange).toBe(fromAccount);
    }
  });

  test("reverse lookup: cache.get(address) returns the entry for any cached path", () => {
    const cache = new HDWalletCache(
      "wallet-chg",
      publicNodeOf(xpubAt(CHANGE_PATH)),
      "bitcoincash",
    );
    const entry = cache.getByPath("3");
    const found = cache.get(entry.address);
    expect(found?.address).toBe(entry.address);
    expect(found?.tokenAddress).toBe(entry.tokenAddress);
  });

  test("persists entries keyed by arbitrary paths and reloads them on init", async () => {
    // Use the process-wide MemoryCache so a second HDWalletCache instance can
    // read what the first persisted.
    const prevMemory = Config.UseMemoryCache;
    Config.UseMemoryCache = true;
    try {
      const node = publicNodeOf(xpubAt(ACCOUNT_PATH));

      const writer = new HDWalletCache(
        "wallet-persist",
        node,
        "bitcoincash",
        /* writeTimeout */ 0,
      );
      await writer.init();

      // Populate entries across branches 0, 1 and the non-default 7, plus a
      // bare-index path that a depth-4 wallet would use.
      const a0 = writer.getByPath("0/0").address;
      const a1 = writer.getByPath("1/2").address;
      const a7 = writer.getByPath("7/5").address;
      await writer.persist(true);

      const reader = new HDWalletCache(
        "wallet-persist",
        node,
        "bitcoincash",
      );
      await reader.init();

      // Reverse-lookup works for every path that was previously written.
      expect(reader.get(a0)?.address).toBe(a0);
      expect(reader.get(a1)?.address).toBe(a1);
      expect(reader.get(a7)?.address).toBe(a7);
    } finally {
      Config.UseMemoryCache = prevMemory;
    }
  });
});
