import { BaseWallet, getStorageProvider } from "../wallet/Base.js";
import EncryptedStorageProvider, {
  DecryptionError,
} from "./EncryptedStorageProvider.js";
import { WalletDbEntryI } from "./interface.js";
import StorageProvider from "./StorageProvider.js";

class MemoryProvider implements StorageProvider {
  // Instances constructed with the same dbName share their backing rows, so
  // re-attaching to the same logical store reads back what an earlier handle
  // wrote — mirroring IndexedDB/Postgres behaviour. Instances built with no
  // dbName are independent.
  private static registry = new Map<string, Map<string, WalletDbEntryI>>();
  static resetAll() {
    MemoryProvider.registry.clear();
  }

  private rows: Map<string, WalletDbEntryI>;
  public metaReads = 0;

  constructor(public readonly dbName?: string) {
    if (dbName !== undefined) {
      let store = MemoryProvider.registry.get(dbName);
      if (!store) {
        store = new Map();
        MemoryProvider.registry.set(dbName, store);
      }
      this.rows = store;
    } else {
      this.rows = new Map();
    }
  }

  async init() {
    return this;
  }
  async close() {
    return this;
  }
  getInfo() {
    return this.dbName ? `memory(${this.dbName})` : "memory";
  }
  async addWallet(name: string, walletId: string): Promise<boolean> {
    if (this.rows.has(name)) return false;
    this.rows.set(name, { name, wallet: walletId });
    return true;
  }
  async getWallet(name: string): Promise<WalletDbEntryI | undefined> {
    if (name === "__enc_meta_v1__") this.metaReads++;
    return this.rows.get(name);
  }
  async getWallets(): Promise<WalletDbEntryI[]> {
    return [...this.rows.values()];
  }
  async updateWallet(name: string, walletId: string): Promise<void> {
    if (!this.rows.has(name)) return;
    this.rows.set(name, { name, wallet: walletId });
  }
  async walletExists(name: string): Promise<boolean> {
    return this.rows.has(name);
  }
  async deleteWallet(name: string): Promise<void> {
    this.rows.delete(name);
  }
}

const SAMPLE_ID =
  "hd:mainnet:abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about:m/44'/0'/0':0:0";

// Use a tiny iteration count for tests so they run fast.
const TEST_OPTIONS = { iterations: 1000 };

async function setupEnc(passphrase = "pw") {
  const wrapped = new MemoryProvider();
  const enc = await new EncryptedStorageProvider(
    wrapped,
    passphrase,
    TEST_OPTIONS,
  ).init();
  return { wrapped, enc };
}

describe("EncryptedStorageProvider", () => {
  test("encrypts wallet field at rest, decrypts on read", async () => {
    const { wrapped, enc } = await setupEnc();

    expect(await enc.addWallet("alice", SAMPLE_ID)).toBe(true);

    const wrappedRow = await wrapped.getWallet("alice");
    expect(wrappedRow?.wallet).toMatch(/^enc:v1:/);
    expect(wrappedRow?.wallet).not.toContain("abandon");

    const decrypted = await enc.getWallet("alice");
    expect(decrypted?.wallet).toBe(SAMPLE_ID);
    expect(decrypted?.name).toBe("alice");
  });

  test("persists salt across instances with same passphrase", async () => {
    const wrapped = new MemoryProvider();
    const a = await new EncryptedStorageProvider(
      wrapped,
      "shared",
      TEST_OPTIONS,
    ).init();
    await a.addWallet("alice", SAMPLE_ID);
    await a.close();

    const b = await new EncryptedStorageProvider(
      wrapped,
      "shared",
      TEST_OPTIONS,
    ).init();
    const row = await b.getWallet("alice");
    expect(row?.wallet).toBe(SAMPLE_ID);
  });

  test("rejects decryption with wrong passphrase at init via verifier", async () => {
    const wrapped = new MemoryProvider();
    const good = await new EncryptedStorageProvider(
      wrapped,
      "correct",
      TEST_OPTIONS,
    ).init();
    await good.addWallet("alice", SAMPLE_ID);

    const bad = new EncryptedStorageProvider(wrapped, "wrong", TEST_OPTIONS);
    await expect(bad.init()).rejects.toBeInstanceOf(DecryptionError);
  });

  test("reads pre-existing plaintext entries (back-compat)", async () => {
    const wrapped = new MemoryProvider();
    await wrapped.addWallet("legacy", SAMPLE_ID);

    const enc = await new EncryptedStorageProvider(
      wrapped,
      "pw",
      TEST_OPTIONS,
    ).init();
    const row = await enc.getWallet("legacy");
    expect(row?.wallet).toBe(SAMPLE_ID);
  });

  test("writes after init are encrypted even with plaintext entries present", async () => {
    const wrapped = new MemoryProvider();
    await wrapped.addWallet("legacy", SAMPLE_ID);

    const enc = await new EncryptedStorageProvider(
      wrapped,
      "pw",
      TEST_OPTIONS,
    ).init();
    await enc.addWallet("fresh", SAMPLE_ID);

    expect((await wrapped.getWallet("legacy"))?.wallet).toBe(SAMPLE_ID);
    expect((await wrapped.getWallet("fresh"))?.wallet).toMatch(/^enc:v1:/);
  });

  test("updateWallet re-encrypts", async () => {
    const { wrapped, enc } = await setupEnc();

    await enc.addWallet("alice", SAMPLE_ID);
    const ct1 = (await wrapped.getWallet("alice"))?.wallet;

    const updatedId = SAMPLE_ID.replace("abandon", "absent");
    await enc.updateWallet("alice", updatedId);
    const ct2 = (await wrapped.getWallet("alice"))?.wallet;

    expect(ct2).toMatch(/^enc:v1:/);
    expect(ct2).not.toBe(ct1);
    expect((await enc.getWallet("alice"))?.wallet).toBe(updatedId);
  });

  test("getWallets returns decrypted entries and excludes meta row", async () => {
    const { wrapped, enc } = await setupEnc();

    await enc.addWallet("a", SAMPLE_ID);
    await enc.addWallet("b", SAMPLE_ID + "+extra");

    const all = await enc.getWallets();
    expect(all.map((r) => r.name).sort()).toEqual(["a", "b"]);
    expect(all.every((r) => !r.wallet.startsWith("enc:v1:"))).toBe(true);

    const rawNames = (await wrapped.getWallets()).map((r) => r.name).sort();
    expect(rawNames).toContain("__enc_meta_v1__");
  });

  test("rejects reserved meta-row name", async () => {
    const { enc } = await setupEnc();
    await expect(enc.addWallet("__enc_meta_v1__", SAMPLE_ID)).rejects.toThrow(
      /reserved/i,
    );
  });

  test("walletExists hides meta row", async () => {
    const { wrapped, enc } = await setupEnc();
    expect(await enc.walletExists("__enc_meta_v1__")).toBe(false);
    expect(await wrapped.walletExists("__enc_meta_v1__")).toBe(true);
  });

  test("getInfo wraps wrapped info", async () => {
    const wrapped = new MemoryProvider();
    const enc = new EncryptedStorageProvider(wrapped, "pw", TEST_OPTIONS);
    expect(enc.getInfo()).toBe("encrypted(memory)");
  });

  test("changePassphrase re-encrypts every decryptable row by default", async () => {
    const { wrapped, enc } = await setupEnc("old");

    await enc.addWallet("alice", SAMPLE_ID);
    await enc.addWallet("bob", SAMPLE_ID + "+bob");
    const aliceCt1 = (await wrapped.getWallet("alice"))?.wallet;

    const { rotated, skipped } = await enc.changePassphrase("new");
    expect(rotated.sort()).toEqual(["alice", "bob"]);
    expect(skipped).toEqual([]);

    // ciphertext changed (new salt + iv)
    const aliceCt2 = (await wrapped.getWallet("alice"))?.wallet;
    expect(aliceCt2).toMatch(/^enc:v1:/);
    expect(aliceCt2).not.toBe(aliceCt1);

    // can still read with same instance (now using new passphrase)
    expect((await enc.getWallet("alice"))?.wallet).toBe(SAMPLE_ID);

    // a fresh instance with the new passphrase can read; old fails
    const withNew = await new EncryptedStorageProvider(
      wrapped,
      "new",
      TEST_OPTIONS,
    ).init();
    expect((await withNew.getWallet("alice"))?.wallet).toBe(SAMPLE_ID);

    await expect(
      new EncryptedStorageProvider(wrapped, "old", TEST_OPTIONS).init(),
    ).rejects.toBeInstanceOf(DecryptionError);
  });

  test("changePassphrase leaves plaintext rows untouched and reports them as skipped", async () => {
    const wrapped = new MemoryProvider();
    await wrapped.addWallet("legacy", SAMPLE_ID); // plaintext

    const enc = await new EncryptedStorageProvider(
      wrapped,
      "old",
      TEST_OPTIONS,
    ).init();
    await enc.addWallet("fresh", SAMPLE_ID);

    const { rotated, skipped } = await enc.changePassphrase("new");
    expect(rotated).toEqual(["fresh"]);
    expect(skipped).toEqual(["legacy"]);
    expect((await wrapped.getWallet("legacy"))?.wallet).toBe(SAMPLE_ID);
  });

  test("changePassphrase with names filter only rewrites the named rows", async () => {
    const { wrapped, enc } = await setupEnc("old");

    await enc.addWallet("alice", SAMPLE_ID);
    await enc.addWallet("bob", SAMPLE_ID + "+bob");
    await enc.addWallet("carol", SAMPLE_ID + "+carol");

    const { rotated, skipped } = await enc.changePassphrase("new", {
      names: ["alice", "bob"],
    });
    expect(rotated.sort()).toEqual(["alice", "bob"]);
    expect(skipped).toEqual(["carol"]);

    const withNew = await new EncryptedStorageProvider(
      wrapped,
      "new",
      TEST_OPTIONS,
    ).init();
    expect((await withNew.getWallet("alice"))?.wallet).toBe(SAMPLE_ID);
    expect((await withNew.getWallet("bob"))?.wallet).toBe(SAMPLE_ID + "+bob");
    // carol was not rotated and is now unrecoverable with the new passphrase
    await expect(withNew.getWallet("carol")).rejects.toThrow(
      /Decryption failed/i,
    );
  });

  test("changePassphrase rejects empty passphrase", async () => {
    const { enc } = await setupEnc();
    await expect(enc.changePassphrase("")).rejects.toThrow(/non-empty/);
  });

  test("meta row is read once per instance, regardless of wallet count", async () => {
    const { wrapped, enc } = await setupEnc();

    // init() triggers the first (and only) meta read for key derivation.
    expect(wrapped.metaReads).toBe(1);

    // Populate many wallets and exercise reads.
    for (let i = 0; i < 25; i++) {
      await enc.addWallet(`w${i}`, SAMPLE_ID + ":" + i);
    }
    for (let i = 0; i < 25; i++) {
      await enc.getWallet(`w${i}`);
    }
    await enc.getWallets();

    // Still exactly one meta read.
    expect(wrapped.metaReads).toBe(1);
  });

  test("rejects ciphertext moved between rows (AAD binding)", async () => {
    const { wrapped, enc } = await setupEnc();

    await enc.addWallet("alice", SAMPLE_ID);
    await enc.addWallet("bob", SAMPLE_ID + "+bob");

    // Tamper with the underlying store: swap alice's ciphertext into bob's row.
    const aliceCt = (await wrapped.getWallet("alice"))!.wallet;
    await wrapped.updateWallet("bob", aliceCt);

    await expect(enc.getWallet("bob")).rejects.toBeInstanceOf(DecryptionError);
    // Alice still reads back fine.
    expect((await enc.getWallet("alice"))?.wallet).toBe(SAMPLE_ID);
  });

  test("init() writes a verifier into the meta row", async () => {
    const wrapped = new MemoryProvider();
    await new EncryptedStorageProvider(wrapped, "pw", TEST_OPTIONS).init();
    const meta = await wrapped.getWallet("__enc_meta_v1__");
    const parsed = JSON.parse(meta!.wallet) as {
      saltHex: string;
      iterations: number;
      verifier?: string;
    };
    expect(parsed.saltHex).toMatch(/^[0-9a-f]+$/);
    expect(parsed.iterations).toBe(TEST_OPTIONS.iterations);
    expect(parsed.verifier).toMatch(/^[0-9a-f]{64}$/); // HMAC-SHA256 hex
  });

  test("init() rejects meta rows that lack a verifier", async () => {
    const wrapped = new MemoryProvider();
    await wrapped.addWallet(
      "__enc_meta_v1__",
      JSON.stringify({
        saltHex: "00112233445566778899aabbccddeeff",
        iterations: TEST_OPTIONS.iterations,
      }),
    );
    const enc = new EncryptedStorageProvider(wrapped, "anything", TEST_OPTIONS);
    await expect(enc.init()).rejects.toThrow(/missing required fields/i);
  });

  test("changePassphrase rewrites the meta row with a fresh verifier", async () => {
    const { wrapped, enc } = await setupEnc("old");
    const before = JSON.parse(
      (await wrapped.getWallet("__enc_meta_v1__"))!.wallet,
    ) as { verifier?: string };
    await enc.changePassphrase("new");
    const after = JSON.parse(
      (await wrapped.getWallet("__enc_meta_v1__"))!.wallet,
    ) as { verifier?: string };
    expect(after.verifier).toMatch(/^[0-9a-f]{64}$/);
    expect(after.verifier).not.toBe(before.verifier);
    // Opening with the new passphrase succeeds; old now fails fast.
    await expect(
      new EncryptedStorageProvider(wrapped, "new", TEST_OPTIONS).init(),
    ).resolves.toBeInstanceOf(EncryptedStorageProvider);
    await expect(
      new EncryptedStorageProvider(wrapped, "old", TEST_OPTIONS).init(),
    ).rejects.toBeInstanceOf(DecryptionError);
  });

  test("failed init() does not poison subsequent attempts", async () => {
    const wrapped = new MemoryProvider();
    await new EncryptedStorageProvider(wrapped, "pw", TEST_OPTIONS).init();

    const wrong = new EncryptedStorageProvider(wrapped, "nope", TEST_OPTIONS);
    await expect(wrong.init()).rejects.toBeInstanceOf(DecryptionError);
    // A fresh instance with the correct passphrase still works.
    await expect(
      new EncryptedStorageProvider(wrapped, "pw", TEST_OPTIONS).init(),
    ).resolves.toBeInstanceOf(EncryptedStorageProvider);
  });

  test("encryptPlaintextRows: converts plaintext rows under the current passphrase", async () => {
    const wrapped = new MemoryProvider();
    // Two plaintext rows pre-existing in the wrapped store.
    await wrapped.addWallet("legacy-a", SAMPLE_ID);
    await wrapped.addWallet("legacy-b", SAMPLE_ID + "+b");

    const enc = await new EncryptedStorageProvider(
      wrapped,
      "pw",
      TEST_OPTIONS,
    ).init();
    // Plus a row that's already encrypted via the wrapper.
    await enc.addWallet("fresh", SAMPLE_ID + "+fresh");

    const { encrypted, skipped } = await enc.encryptPlaintextRows();
    expect(encrypted.sort()).toEqual(["legacy-a", "legacy-b"]);
    expect(skipped).toEqual(["fresh"]);

    // All non-meta rows are now encrypted at rest.
    for (const name of ["legacy-a", "legacy-b", "fresh"]) {
      const raw = (await wrapped.getWallet(name))!.wallet;
      expect(raw).toMatch(/^enc:v1:/);
    }
    // …and still decrypt correctly.
    expect((await enc.getWallet("legacy-a"))?.wallet).toBe(SAMPLE_ID);
    expect((await enc.getWallet("legacy-b"))?.wallet).toBe(SAMPLE_ID + "+b");
    expect((await enc.getWallet("fresh"))?.wallet).toBe(SAMPLE_ID + "+fresh");
  });

  test("encryptPlaintextRows with names filter only encrypts the listed rows", async () => {
    const wrapped = new MemoryProvider();
    await wrapped.addWallet("legacy-a", SAMPLE_ID);
    await wrapped.addWallet("legacy-b", SAMPLE_ID + "+b");
    const enc = await new EncryptedStorageProvider(
      wrapped,
      "pw",
      TEST_OPTIONS,
    ).init();

    const { encrypted, skipped } = await enc.encryptPlaintextRows({
      names: ["legacy-a"],
    });
    expect(encrypted).toEqual(["legacy-a"]);
    expect(skipped).toEqual(["legacy-b"]);

    expect((await wrapped.getWallet("legacy-a"))!.wallet).toMatch(/^enc:v1:/);
    expect((await wrapped.getWallet("legacy-b"))!.wallet).toBe(
      SAMPLE_ID + "+b",
    );
  });

  test("DecryptionError is named and instanceof Error", async () => {
    const err = new DecryptionError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DecryptionError);
    expect(err.name).toBe("DecryptionError");
    expect(err.message).toMatch(/Decryption failed/);
  });

  test("deleteWallet removes a row and forwards to the wrapped provider", async () => {
    const { wrapped, enc } = await setupEnc();
    await enc.addWallet("alice", SAMPLE_ID);
    expect(await enc.walletExists("alice")).toBe(true);
    expect(await wrapped.walletExists("alice")).toBe(true);

    await enc.deleteWallet("alice");
    expect(await enc.walletExists("alice")).toBe(false);
    expect(await wrapped.walletExists("alice")).toBe(false);
  });

  test("deleteWallet refuses to remove the reserved meta row", async () => {
    const { wrapped, enc } = await setupEnc();
    await expect(enc.deleteWallet("__enc_meta_v1__")).rejects.toThrow(
      /reserved/i,
    );
    // Meta row is still intact on the wrapped provider.
    expect(await wrapped.walletExists("__enc_meta_v1__")).toBe(true);
  });

  test("deleteWallet on a missing name is a no-op", async () => {
    const { enc } = await setupEnc();
    await expect(enc.deleteWallet("nope")).resolves.toBeUndefined();
  });

  test("removeEncryption decrypts every encrypted row and deletes the meta", async () => {
    const { wrapped, enc } = await setupEnc();
    await enc.addWallet("alice", SAMPLE_ID);
    await enc.addWallet("bob", SAMPLE_ID + "+bob");
    // Sanity: meta + encrypted rows present on the wrapped provider.
    expect(await wrapped.walletExists("__enc_meta_v1__")).toBe(true);
    expect((await wrapped.getWallet("alice"))!.wallet).toMatch(/^enc:v1:/);

    const { decrypted, skipped } = await enc.removeEncryption();
    expect(decrypted.sort()).toEqual(["alice", "bob"]);
    expect(skipped).toEqual([]);

    // The wrapped provider now holds plaintext, no meta row.
    expect((await wrapped.getWallet("alice"))!.wallet).toBe(SAMPLE_ID);
    expect((await wrapped.getWallet("bob"))!.wallet).toBe(SAMPLE_ID + "+bob");
    expect(await wrapped.walletExists("__enc_meta_v1__")).toBe(false);
  });

  test("removeEncryption leaves plaintext rows untouched and reports them as skipped", async () => {
    const wrapped = new MemoryProvider();
    await wrapped.addWallet("legacy", SAMPLE_ID); // plaintext pre-existing
    const enc = await new EncryptedStorageProvider(
      wrapped,
      "pw",
      TEST_OPTIONS,
    ).init();
    await enc.addWallet("fresh", SAMPLE_ID + "+fresh");

    const { decrypted, skipped } = await enc.removeEncryption();
    expect(decrypted).toEqual(["fresh"]);
    expect(skipped).toEqual(["legacy"]);
    expect((await wrapped.getWallet("legacy"))!.wallet).toBe(SAMPLE_ID);
    expect((await wrapped.getWallet("fresh"))!.wallet).toBe(
      SAMPLE_ID + "+fresh",
    );
    expect(await wrapped.walletExists("__enc_meta_v1__")).toBe(false);
  });

  test("removeEncryption skips ciphertext that cannot be decrypted", async () => {
    const { wrapped, enc } = await setupEnc();
    await enc.addWallet("alice", SAMPLE_ID);
    // Plant a row encrypted under a different key (simulate corruption /
    // a stray entry rotated under a previous passphrase).
    const strayWrapped = new MemoryProvider();
    const stray = await new EncryptedStorageProvider(
      strayWrapped,
      "other",
      TEST_OPTIONS,
    ).init();
    await stray.addWallet("stray", SAMPLE_ID);
    // Copy the ciphertext into our wrapped.
    const strayCt = (await strayWrapped.getWallet("stray"))!.wallet;
    await wrapped.addWallet("stray", strayCt);

    const { decrypted, skipped } = await enc.removeEncryption();
    expect(decrypted).toEqual(["alice"]);
    expect(skipped).toEqual(["stray"]);
    // alice is back in plaintext; stray's undecryptable ciphertext is left
    // alone so the user can deal with it.
    expect((await wrapped.getWallet("alice"))!.wallet).toBe(SAMPLE_ID);
    expect((await wrapped.getWallet("stray"))!.wallet).toBe(strayCt);
    expect(await wrapped.walletExists("__enc_meta_v1__")).toBe(false);
  });

  test("wrapProvider produces a (dbName)-only class compatible with BaseWallet.StorageProvider", async () => {
    MemoryProvider.resetAll();
    const Bound = EncryptedStorageProvider.wrapProvider(
      MemoryProvider,
      "pw",
      TEST_OPTIONS,
    );

    const prev = BaseWallet.StorageProvider;
    BaseWallet.StorageProvider = Bound as unknown as typeof StorageProvider;

    try {
      // First open: writes through the wrapper land encrypted in the wrapped.
      const db1 = getStorageProvider("regtest")!;
      expect(db1).toBeInstanceOf(EncryptedStorageProvider);
      await db1.init();
      await db1.addWallet("alice", SAMPLE_ID);
      await db1.close();

      // Inspect the shared wrapped store via a fresh MemoryProvider on the same
      // dbName — constructor shares rows with all earlier handles.
      const wrapped = new MemoryProvider("regtest");
      expect((await wrapped.getWallet("alice"))?.wallet).toMatch(/^enc:v1:/);

      // Second open with the same dbName: hydrates from the same wrapped store
      // and decrypts cleanly with the same baked-in passphrase.
      const db2 = getStorageProvider("regtest")!;
      await db2.init();
      expect((await db2.getWallet("alice"))?.wallet).toBe(SAMPLE_ID);
      await db2.close();

      // A different dbName gets its own backing store and its own meta row.
      const db3 = getStorageProvider("testnet")!;
      await db3.init();
      expect(await db3.getWallet("alice")).toBeUndefined();
      await db3.close();
    } finally {
      BaseWallet.StorageProvider = prev;
    }
  });

  test("wrapProvider rejects when called with the wrong passphrase on a populated store", async () => {
    MemoryProvider.resetAll();

    // Open once with the correct passphrase and stamp a meta row.
    const Good = EncryptedStorageProvider.wrapProvider(
      MemoryProvider,
      "correct",
      TEST_OPTIONS,
    );
    await new Good("db").init();

    // Re-open with the wrong passphrase: init() must reject via verifier.
    const Bad = EncryptedStorageProvider.wrapProvider(
      MemoryProvider,
      "wrong",
      TEST_OPTIONS,
    );
    await expect(new Bad("db").init()).rejects.toBeInstanceOf(DecryptionError);
  });
});
