import {
  base64ToBin,
  binToBase64,
  binToHex,
  binToUtf8,
  generateRandomBytes,
  hexToBin,
  hmacSha256,
  pbkdf2HmacSha512,
  utf8ToBin,
} from "@bitauth/libauth";
import type { WalletDbEntryI } from "./interface.js";
import type StorageProvider from "./StorageProvider.js";

const ENC_PREFIX = "enc:v1:";
const META_ROW_NAME = "__enc_meta_v1__";
const DEFAULT_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const HMAC_KEY_LENGTH = 32;
const IV_LENGTH = 12;
const VERIFIER_INPUT = utf8ToBin("EncryptedStorageProvider-v1-verifier");

interface EncMeta {
  saltHex: string;
  iterations: number;
  // Hex HMAC-SHA256(hmacKey, VERIFIER_INPUT). Always present; init() rejects
  // any meta row that lacks one.
  verifier: string;
}

interface DerivedKeys {
  aesKey: CryptoKey;
  hmacKey: Uint8Array;
}

/**
 * Thrown by EncryptedStorageProvider when decryption fails -- either because
 * the supplied passphrase is wrong, the ciphertext was tampered with, or the
 * row was rebound to a different name (AAD mismatch).
 */
export class DecryptionError extends Error {
  constructor(
    message = "Decryption failed: wrong passphrase, wrong row name, or corrupted ciphertext",
  ) {
    super(message);
    this.name = "DecryptionError";
  }
}

function getSubtle(): SubtleCrypto {
  const subtle = (globalThis as any).crypto?.subtle as SubtleCrypto | undefined;
  if (!subtle) {
    throw new Error(
      "WebCrypto SubtleCrypto is not available. EncryptedStorageProvider requires Node 19+ or a browser secure context.",
    );
  }
  return subtle;
}

async function deriveKeys(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<DerivedKeys> {
  // Derive AES_KEY || HMAC_KEY from one PBKDF2 pass.
  const result = pbkdf2HmacSha512({
    password: utf8ToBin(passphrase),
    salt,
    iterations,
    derivedKeyLength: KEY_LENGTH + HMAC_KEY_LENGTH,
  });
  if (typeof result === "string") {
    throw new Error(`PBKDF2 derivation failed: ${result}`);
  }
  const buf = result as Uint8Array;
  const aesKey = await getSubtle().importKey(
    "raw",
    buf.slice(0, KEY_LENGTH) as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  const hmacKey = buf.slice(KEY_LENGTH);
  return { aesKey, hmacKey };
}

function computeVerifier(hmacKey: Uint8Array): string {
  return binToHex(hmacSha256(hmacKey, VERIFIER_INPUT));
}

async function encryptString(
  key: CryptoKey,
  plaintext: string,
  aad: string,
): Promise<string> {
  const iv = generateRandomBytes(IV_LENGTH);
  const ct = new Uint8Array(
    await getSubtle().encrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
        additionalData: utf8ToBin(aad) as BufferSource,
      },
      key,
      utf8ToBin(plaintext) as BufferSource,
    ),
  );
  return `${ENC_PREFIX}${binToBase64(iv)}:${binToBase64(ct)}`;
}

// Precondition: payload starts with ENC_PREFIX. Internal callers gate on that
// via the same constant before delegating here.
async function decryptString(
  key: CryptoKey,
  payload: string,
  aad: string,
): Promise<string> {
  const body = payload.slice(ENC_PREFIX.length);
  const sep = body.indexOf(":");
  if (sep <= 0 || sep >= body.length - 1) {
    throw new Error("Malformed encrypted payload");
  }
  const iv = base64ToBin(body.slice(0, sep));
  const ct = base64ToBin(body.slice(sep + 1));
  let pt: ArrayBuffer;
  try {
    pt = await getSubtle().decrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
        additionalData: utf8ToBin(aad) as BufferSource,
      },
      key,
      ct as BufferSource,
    );
  } catch {
    throw new DecryptionError();
  }
  return binToUtf8(new Uint8Array(pt));
}

/**
 * EncryptedStorageProvider wraps any StorageProvider and transparently
 * encrypts the `wallet` field (the wallet ID / serialized seed) at rest.
 *
 * The `name` field is left in plaintext so existing lookup-by-name semantics
 * are preserved.
 *
 * Salt, iteration count, and a passphrase verifier (HMAC-SHA256 over a fixed
 * marker, keyed with PBKDF2-derived material) are persisted as a metadata row
 * in the wrapped provider. `init()` verifies the passphrase against this row
 * and fails fast with {@link DecryptionError} on mismatch.
 *
 * Backwards compatibility: plaintext wallet IDs already in the wrapped
 * provider are returned as-is on read; subsequent writes are always encrypted.
 *
 * AAD binding: each row's ciphertext is authenticated against the row name,
 * so renaming a wallet is not supported in-place -- the caller must read the
 * plaintext, write under the new name, and remove the old row.
 */
export class EncryptedStorageProvider implements StorageProvider {
  private wrapped: StorageProvider;
  private passphrase: string;
  private iterations: number;
  private keysPromise: Promise<DerivedKeys> | null = null;

  constructor(
    wrapped: StorageProvider,
    passphrase: string,
    options: { iterations?: number } = {},
  ) {
    if (!wrapped) {
      throw new Error("EncryptedStorageProvider requires a wrapped provider");
    }
    if (!passphrase) {
      throw new Error(
        "EncryptedStorageProvider requires a non-empty passphrase",
      );
    }
    this.wrapped = wrapped;
    this.passphrase = passphrase;
    this.iterations = options.iterations ?? DEFAULT_ITERATIONS;
  }

  /**
   * Build a single-arg `(dbName: string)` subclass suitable for assignment to
   * `BaseWallet.StorageProvider`. The wrapped provider class and the passphrase
   * are baked in; each `new Bound(dbName)` constructs a fresh wrapped provider
   * with that dbName and wraps it.
   *
   * @example
   *   BaseWallet.StorageProvider = EncryptedStorageProvider.wrapProvider(
   *     IndexedDBProvider,
   *     userPassphrase,
   *   );
   */
  static wrapProvider(
    wrappedProvider: new (dbName: string) => StorageProvider,
    passphrase: string,
    options?: { iterations?: number },
  ): new (
    dbName: string,
  ) => EncryptedStorageProvider {
    return class BoundEncryptedStorageProvider extends EncryptedStorageProvider {
      constructor(dbName: string) {
        super(new wrappedProvider(dbName), passphrase, options);
      }
    };
  }

  private async getKeys(): Promise<DerivedKeys> {
    if (this.keysPromise) return this.keysPromise;
    this.keysPromise = (async () => {
      const meta = await this.readMeta();
      if (!meta) {
        // Fresh store: derive keys, stamp meta with a verifier, persist it.
        const saltHex = binToHex(generateRandomBytes(SALT_LENGTH));
        const keys = await deriveKeys(
          this.passphrase,
          hexToBin(saltHex),
          this.iterations,
        );
        await this.writeMeta({
          saltHex,
          iterations: this.iterations,
          verifier: computeVerifier(keys.hmacKey),
        });
        return keys;
      }

      const keys = await deriveKeys(
        this.passphrase,
        hexToBin(meta.saltHex),
        meta.iterations,
      );
      if (meta.verifier !== computeVerifier(keys.hmacKey)) {
        throw new DecryptionError(
          "Decryption failed: wrong passphrase for encrypted store",
        );
      }
      return keys;
    })();
    return this.keysPromise.catch((err) => {
      // Don't cache the rejection -- a follow-up call with a corrected
      // passphrase (or a stale-state retry) should be allowed to re-derive.
      this.keysPromise = null;
      throw err;
    });
  }

  private async readMeta(): Promise<EncMeta | undefined> {
    const row = await this.wrapped.getWallet(META_ROW_NAME);
    if (!row) return undefined;
    let parsed: Partial<EncMeta>;
    try {
      parsed = JSON.parse(row.wallet);
    } catch {
      throw new Error("Encrypted store metadata is corrupted");
    }
    if (
      typeof parsed.saltHex !== "string" ||
      typeof parsed.iterations !== "number" ||
      typeof parsed.verifier !== "string"
    ) {
      throw new Error(
        "Encrypted store metadata is missing required fields (saltHex, iterations, verifier)",
      );
    }
    return parsed as EncMeta;
  }

  private async writeMeta(meta: EncMeta): Promise<void> {
    const serialized = JSON.stringify(meta);
    if (await this.wrapped.walletExists(META_ROW_NAME)) {
      await this.wrapped.updateWallet(META_ROW_NAME, serialized);
    } else {
      await this.wrapped.addWallet(META_ROW_NAME, serialized);
    }
  }

  async init(): Promise<EncryptedStorageProvider> {
    await this.wrapped.init();
    await this.getKeys();
    return this;
  }

  async close(): Promise<EncryptedStorageProvider> {
    await this.wrapped.close();
    this.keysPromise = null;
    return this;
  }

  getInfo(): string {
    return `encrypted(${this.wrapped.getInfo()})`;
  }

  async addWallet(name: string, walletId: string): Promise<boolean> {
    if (name === META_ROW_NAME) {
      throw new Error(
        `Wallet name "${META_ROW_NAME}" is reserved by EncryptedStorageProvider`,
      );
    }
    const { aesKey } = await this.getKeys();
    const ciphertext = await encryptString(aesKey, walletId, name);
    return this.wrapped.addWallet(name, ciphertext);
  }

  async getWallet(name: string): Promise<WalletDbEntryI | undefined> {
    if (name === META_ROW_NAME) return undefined;
    const row = await this.wrapped.getWallet(name);
    if (!row) return undefined;
    return { ...row, wallet: await this.decryptField(row.wallet, name) };
  }

  async getWallets(): Promise<WalletDbEntryI[]> {
    const rows = await this.wrapped.getWallets();
    const result: WalletDbEntryI[] = [];
    for (const row of rows) {
      if (row.name === META_ROW_NAME) continue;
      result.push({
        ...row,
        wallet: await this.decryptField(row.wallet, row.name),
      });
    }
    return result;
  }

  async updateWallet(name: string, walletId: string): Promise<void> {
    if (name === META_ROW_NAME) {
      throw new Error(
        `Wallet name "${META_ROW_NAME}" is reserved by EncryptedStorageProvider`,
      );
    }
    const { aesKey } = await this.getKeys();
    const ciphertext = await encryptString(aesKey, walletId, name);
    await this.wrapped.updateWallet(name, ciphertext);
  }

  async walletExists(name: string): Promise<boolean> {
    if (name === META_ROW_NAME) return false;
    return this.wrapped.walletExists(name);
  }

  async deleteWallet(name: string): Promise<void> {
    if (name === META_ROW_NAME) {
      throw new Error(
        `Wallet name "${META_ROW_NAME}" is reserved by EncryptedStorageProvider`,
      );
    }
    await this.wrapped.deleteWallet(name);
  }

  private async decryptField(payload: string, name: string): Promise<string> {
    if (!payload.startsWith(ENC_PREFIX)) {
      return payload;
    }
    const { aesKey } = await this.getKeys();
    return decryptString(aesKey, payload, name);
  }

  /**
   * Re-encrypt entries with a new passphrase. A fresh salt is generated, a new
   * key is derived, the meta row is rewritten with a new verifier, and the
   * wrapper switches to using the new passphrase for all subsequent reads and
   * writes.
   *
   * By default every encrypted row that can be decrypted with the current
   * passphrase is re-encrypted. Plaintext rows are left untouched. Rows that
   * fail to decrypt are skipped and reported.
   *
   * When `options.names` is provided only those rows are re-encrypted. Any
   * other encrypted rows will become unrecoverable, because after the change
   * the old key is gone. Use this mode only when you knowingly want to drop
   * unselected entries (e.g. after migrating them elsewhere).
   *
   * When `options.iterations` is provided the new key is derived with that
   * iteration count; otherwise the wrapper's current iteration count is reused.
   *
   * @returns `rotated` -- names of rows that were re-encrypted; `skipped` --
   *   names that were left alone (plaintext, failed to decrypt, or filtered
   *   out by `options.names`).
   */
  async changePassphrase(
    newPassphrase: string,
    options: { names?: string[]; iterations?: number } = {},
  ): Promise<{ rotated: string[]; skipped: string[] }> {
    if (!newPassphrase) {
      throw new Error("changePassphrase requires a non-empty passphrase");
    }

    const oldKeys = await this.getKeys();
    const newIterations = options.iterations ?? this.iterations;
    const newSalt = generateRandomBytes(SALT_LENGTH);
    const newKeys = await deriveKeys(newPassphrase, newSalt, newIterations);

    const allRows = await this.wrapped.getWallets();
    const filter = options.names ? new Set(options.names) : null;

    const rotated: string[] = [];
    const skipped: string[] = [];

    for (const row of allRows) {
      if (row.name === META_ROW_NAME) continue;
      if (filter && !filter.has(row.name)) {
        skipped.push(row.name);
        continue;
      }
      if (!row.wallet.startsWith(ENC_PREFIX)) {
        skipped.push(row.name);
        continue;
      }
      let plaintext: string;
      try {
        plaintext = await decryptString(oldKeys.aesKey, row.wallet, row.name);
      } catch {
        skipped.push(row.name);
        continue;
      }
      const ciphertext = await encryptString(
        newKeys.aesKey,
        plaintext,
        row.name,
      );
      await this.wrapped.updateWallet(row.name, ciphertext);
      rotated.push(row.name);
    }

    await this.writeMeta({
      saltHex: binToHex(newSalt),
      iterations: newIterations,
      verifier: computeVerifier(newKeys.hmacKey),
    });
    this.passphrase = newPassphrase;
    this.iterations = newIterations;
    this.keysPromise = Promise.resolve(newKeys);

    return { rotated, skipped };
  }

  /**
   * Encrypt every plaintext row in the store under the current passphrase.
   * Used to migrate legacy (or back-compat-read) entries into the encrypted
   * format -- for example, when a consumer enables encryption on a store that
   * previously held plaintext wallets.
   *
   * Already-encrypted rows are left alone. With `options.names`, only the
   * listed plaintext rows are encrypted; the rest are reported as skipped.
   *
   * @returns the names of rows that were encrypted and the names that were
   *   skipped (already encrypted, or filtered out).
   */
  async encryptPlaintextRows(
    options: { names?: string[] } = {},
  ): Promise<{ encrypted: string[]; skipped: string[] }> {
    const { aesKey } = await this.getKeys();
    const allRows = await this.wrapped.getWallets();
    const filter = options.names ? new Set(options.names) : null;

    const encrypted: string[] = [];
    const skipped: string[] = [];

    for (const row of allRows) {
      if (row.name === META_ROW_NAME) continue;
      if (filter && !filter.has(row.name)) {
        skipped.push(row.name);
        continue;
      }
      if (row.wallet.startsWith(ENC_PREFIX)) {
        skipped.push(row.name);
        continue;
      }
      const ciphertext = await encryptString(aesKey, row.wallet, row.name);
      await this.wrapped.updateWallet(row.name, ciphertext);
      encrypted.push(row.name);
    }

    return { encrypted, skipped };
  }

  /**
   * Decrypt every encrypted row back to plaintext on the wrapped provider and
   * delete the metadata row. After this call the wrapped store is in the same
   * shape it had before encryption was enabled.
   *
   * The wrapper itself is not decommissioned. A subsequent write through this
   * instance (or a freshly constructed one with the same passphrase) will see
   * an empty meta row, derive a new key, and re-establish encryption with a
   * fresh salt. Discard the instance and stop wrapping the store if you want
   * to keep it plaintext.
   *
   * Rows that cannot be decrypted (corrupted ciphertext, or encrypted under a
   * different passphrase) are left in place and reported as skipped.
   * Plaintext rows are also reported as skipped.
   *
   * @returns `decrypted` -- names of rows that were turned back into plaintext;
   *   `skipped` -- names that were left alone (plaintext, or failed to decrypt).
   */
  async removeEncryption(): Promise<{
    decrypted: string[];
    skipped: string[];
  }> {
    const { aesKey } = await this.getKeys();
    const allRows = await this.wrapped.getWallets();

    const decrypted: string[] = [];
    const skipped: string[] = [];

    for (const row of allRows) {
      if (row.name === META_ROW_NAME) continue;
      if (!row.wallet.startsWith(ENC_PREFIX)) {
        skipped.push(row.name);
        continue;
      }
      let plaintext: string;
      try {
        plaintext = await decryptString(aesKey, row.wallet, row.name);
      } catch {
        skipped.push(row.name);
        continue;
      }
      await this.wrapped.updateWallet(row.name, plaintext);
      decrypted.push(row.name);
    }

    await this.wrapped.deleteWallet(META_ROW_NAME);
    this.keysPromise = null;

    return { decrypted, skipped };
  }
}

export default EncryptedStorageProvider;
