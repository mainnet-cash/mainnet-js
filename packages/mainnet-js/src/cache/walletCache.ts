import {
  assertSuccess,
  binToHex,
  CashAddressNetworkPrefix,
  CashAddressType,
  deriveHdPathRelative,
  encodeCashAddress,
  HdPrivateNodeValid,
  HdPublicNodeValid,
  hash160,
  hexToBin,
  secp256k1,
} from "@bitauth/libauth";
import { Config } from "../config.js";
import { TxI, Utxo } from "../interface.js";
import { IndexedDbCache } from "./IndexedDbCache.js";
import { CacheProvider } from "./interface.js";
import { MemoryCache } from "./MemoryCache.js";
import { WebStorageCache } from "./WebStorageCache.js";

export const stringify = (_: any) =>
  JSON.stringify(_, (key, value) => {
    if (key.includes("Key")) {
      // Watching-only entries have `privateKey === undefined`; preserve that
      // by emitting null rather than calling binToHex on undefined.
      return value === undefined ? null : binToHex(value);
    }
    return typeof value === "bigint" ? value.toString() + "n" : value;
  });
export const parse = (data: string) =>
  JSON.parse(data, (key, value) => {
    if (key.includes("Key")) {
      if (value === null) return undefined;
      if (typeof value === "string") return hexToBin(value);
    }

    if (typeof value === "string" && /^\d+n$/.test(value)) {
      return BigInt(value.slice(0, -1));
    }
    return value;
  });

export interface WalletCacheEntry {
  address: string;
  tokenAddress: string;
  privateKey: Uint8Array | undefined;
  publicKey: Uint8Array;
  publicKeyHash: Uint8Array;
  status: string | null;
  utxos: Utxo[];
  rawHistory: TxI[];
  // Top block height of confirmed history items, used for incremental fetching
  lastConfirmedHeight: number;
}

// Minimal interface for use in transaction signing
export interface WalletCache {
  get(address: string): { privateKey: Uint8Array | undefined } | undefined;
}

// Full interface for wallet cache management
export interface WalletCacheI extends WalletCache {
  init(): Promise<void>;
  persist(immediate?: boolean): Promise<void>;
  get(address: string): WalletCacheEntry | undefined;
  /**
   * Conventional (branch × addressIndex) lookup using the standard
   * `${branch}/${index}` derivation path.
   */
  getByIndex(addressIndex: number, branch: number): WalletCacheEntry;
  /**
   * Derive (or fetch from cache) the address at the given relative derivation
   * path. The cache is policy-free -- the caller decides what path to ask
   * for (e.g. a depth-4 wallet with a bare-index chain, or arbitrary integer
   * branches).
   */
  getByPath(relativePath: string): WalletCacheEntry;
  setStatusAndUtxos(
    address: string,
    status: string | null,
    utxos: Utxo[],
    rawHistory: TxI[],
    lastConfirmedHeight: number,
  ): void;
}

function getStorage(): CacheProvider | undefined {
  if (Config.UseMemoryCache) return new MemoryCache();
  if (Config.UseLocalStorageCache) return new WebStorageCache();
  if (Config.UseIndexedDBCache) return new IndexedDbCache("WalletCache");
  return undefined;
}

/// Cache for single-address wallets (WatchWallet, Wif)
export class SingleAddressWalletCache implements WalletCacheI {
  private entry: WalletCacheEntry;
  private _storage: CacheProvider | undefined;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    public walletId: string,
    address: string,
    tokenAddress: string,
    public writeTimeout: number = 2000,
  ) {
    this.entry = {
      address,
      tokenAddress,
      privateKey: undefined,
      publicKey: new Uint8Array(),
      publicKeyHash: new Uint8Array(),
      status: null,
      utxos: [],
      rawHistory: [],
      lastConfirmedHeight: 0,
    };
  }

  public async init() {
    this._storage = getStorage();
    await this._storage?.init();
    const data = await this._storage?.getItem(`walletCache-${this.walletId}`);
    if (data) {
      try {
        const parsed = parse(data);
        // Restore persisted fields, keep address identity from constructor
        const addr = this.entry.address;
        const tokenAddr = this.entry.tokenAddress;
        Object.assign(this.entry, parsed, {
          address: addr,
          tokenAddress: tokenAddr,
        });
      } catch (_e) {
        // ignore
      }
    }
  }

  public async persist(immediate = false) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (immediate) {
      this.debounceTimer = undefined;
      await this._storage?.setItem(
        `walletCache-${this.walletId}`,
        stringify(this.entry),
      );
    } else {
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = undefined;
        this._storage?.setItem(
          `walletCache-${this.walletId}`,
          stringify(this.entry),
        );
      }, this.writeTimeout);
    }
  }

  public get(address: string) {
    return address === this.entry.address ? this.entry : undefined;
  }

  public getByIndex(_index: number, _branch: number) {
    return this.entry;
  }

  public getByPath(_path: string) {
    return this.entry;
  }

  public setStatusAndUtxos(
    address: string,
    status: string | null,
    utxos: Utxo[],
    rawHistory: TxI[],
    lastConfirmedHeight: number,
  ) {
    if (address !== this.entry.address) return;
    this.entry.status = status;
    this.entry.utxos = utxos;
    this.entry.rawHistory = rawHistory;
    this.entry.lastConfirmedHeight = lastConfirmedHeight;
    this.persist();
  }
}

export class HDWalletCache implements WalletCacheI {
  private _storage: CacheProvider | undefined;
  private walletCache: Record<string, WalletCacheEntry> = {};
  // Address -> relative derivation path. Used to find the cache key for a
  // given address; independent of any branch / change-axis semantics.
  private pathCache: Record<string, string> = {};
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    public walletId: string,
    public hdNode: HdPublicNodeValid | HdPrivateNodeValid,
    public networkPrefix: string,
    public writeTimeout: number = 2000,
  ) {
    if (!this.hdNode) {
      throw new Error("HDNode is undefined");
    }
  }

  public async init() {
    this._storage = getStorage();
    await this._storage?.init();
    const data = await this._storage?.getItem(`walletCache-${this.walletId}`);
    if (data) {
      try {
        const parsed = parse(data);
        this.walletCache = parsed.walletCache || {};
        this.pathCache = parsed.pathCache || {};
      } catch (e) {
        // ignore
      }
    }
  }

  public async persist(immediate = false) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    const write = () =>
      this._storage?.setItem(
        `walletCache-${this.walletId}`,
        stringify({
          walletCache: this.walletCache,
          pathCache: this.pathCache,
        }),
      );
    if (immediate) {
      this.debounceTimer = undefined;
      await write();
    } else {
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = undefined;
        write();
      }, this.writeTimeout);
    }
  }

  /**
   * Derive (or fetch from cache) the address at the given relative derivation
   * path. The cache is policy-free -- the caller decides what path to ask
   * for (e.g. a depth-4 wallet with a bare-index chain, or arbitrary integer
   * branches).
   */
  public getByPath(relativePath: string): WalletCacheEntry {
    const id = `${this.walletId}-${relativePath}`;
    if (!this.walletCache[id]) {
      const node = deriveHdPathRelative(this.hdNode, relativePath);

      const privateKey = "privateKey" in node ? node.privateKey : undefined;
      const publicKey =
        "publicKey" in node
          ? node.publicKey
          : assertSuccess(secp256k1.derivePublicKeyUncompressed(privateKey!));
      const publicKeyCompressed = assertSuccess(
        secp256k1.compressPublicKey(publicKey),
      );
      const publicKeyHash = hash160(publicKeyCompressed);

      const address = encodeCashAddress({
        throwErrors: true,
        prefix: this.networkPrefix as CashAddressNetworkPrefix,
        type: CashAddressType.p2pkh,
        payload: publicKeyHash,
      }).address;

      const tokenAddress = encodeCashAddress({
        throwErrors: true,
        prefix: this.networkPrefix as CashAddressNetworkPrefix,
        type: CashAddressType.p2pkhWithTokens,
        payload: publicKeyHash,
      }).address;

      this.walletCache[id] = {
        address,
        tokenAddress,
        privateKey: privateKey,
        publicKey,
        publicKeyHash,
        status: null,
        utxos: [],
        rawHistory: [],
        lastConfirmedHeight: 0,
      };

      this.pathCache[address] = relativePath;

      this.persist();
    }

    return this.walletCache[id];
  }

  /**
   * Conventional (branch × addressIndex) lookup. Thin wrapper around
   * {@link getByPath} that uses the standard `${branch}/${index}` convention.
   */
  public getByIndex(addressIndex: number, branch: number): WalletCacheEntry {
    return this.getByPath(`${branch}/${addressIndex}`);
  }

  public get(address: string) {
    const path = this.pathCache[address];
    if (path === undefined) return undefined;
    return this.walletCache[`${this.walletId}-${path}`];
  }

  public setStatusAndUtxos(
    address: string,
    status: string | null,
    utxos: Utxo[],
    rawHistory: TxI[],
    lastConfirmedHeight: number,
  ) {
    const path = this.pathCache[address];
    if (path === undefined) {
      return;
    }
    const key = `${this.walletId}-${path}`;
    if (!this.walletCache[key]) {
      return;
    }
    this.walletCache[key].status = status;
    this.walletCache[key].utxos = utxos;
    this.walletCache[key].rawHistory = rawHistory;
    this.walletCache[key].lastConfirmedHeight = lastConfirmedHeight;

    this.persist();
  }
}
