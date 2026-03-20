import {
  assertSuccess,
  binToHex,
  CashAddressNetworkPrefix,
  CashAddressType,
  deriveHdPathRelative,
  encodeCashAddress,
  hash160,
  HdPrivateNodeValid,
  HdPublicNodeValid,
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
    if (key.includes("Key")) return binToHex(value);
    return typeof value === "bigint" ? value.toString() + "n" : value;
  });
export const parse = (data: string) =>
  JSON.parse(data, (key, value) => {
    if (key.includes("Key") && typeof value === "string") {
      return hexToBin(value);
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
  index: number;
  change: boolean;
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
  getByIndex(addressIndex: number, change: boolean): WalletCacheEntry;
  setStatusAndUtxos(
    address: string,
    status: string | null,
    utxos: Utxo[],
    rawHistory: TxI[],
    lastConfirmedHeight: number
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
    public writeTimeout: number = 2000
  ) {
    this.entry = {
      address,
      tokenAddress,
      privateKey: undefined,
      publicKey: new Uint8Array(),
      publicKeyHash: new Uint8Array(),
      index: 0,
      change: false,
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
        stringify(this.entry)
      );
    } else {
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = undefined;
        this._storage?.setItem(
          `walletCache-${this.walletId}`,
          stringify(this.entry)
        );
      }, this.writeTimeout);
    }
  }

  public get(address: string) {
    return address === this.entry.address ? this.entry : undefined;
  }

  public getByIndex(_index: number, _change: boolean) {
    return this.entry;
  }

  public setStatusAndUtxos(
    address: string,
    status: string | null,
    utxos: Utxo[],
    rawHistory: TxI[],
    lastConfirmedHeight: number
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
  private indexCache: Record<
    string,
    {
      index: number;
      change: boolean;
    }
  > = {};
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    public walletId: string,
    public hdNode: HdPublicNodeValid | HdPrivateNodeValid,
    public networkPrefix: string,
    public writeTimeout: number = 2000
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
        this.indexCache = parsed.indexCache || {};
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
          indexCache: this.indexCache,
        })
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

  public getByIndex(addressIndex: number, change: boolean) {
    const id = `${this.walletId}-${addressIndex}-${change}`;
    if (!this.walletCache[id]) {
      const node = deriveHdPathRelative(
        this.hdNode,
        `${change ? 1 : 0}/${addressIndex}`
      );

      const privateKey = "privateKey" in node ? node.privateKey : undefined;
      const publicKey =
        "publicKey" in node
          ? node.publicKey
          : assertSuccess(secp256k1.derivePublicKeyUncompressed(privateKey!));
      const publicKeyCompressed = assertSuccess(
        secp256k1.compressPublicKey(publicKey)
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
        index: addressIndex,
        change,
        status: null,
        utxos: [],
        rawHistory: [],
        lastConfirmedHeight: 0,
      };

      this.indexCache[address] = {
        index: addressIndex,
        change,
      };

      this.persist();
    }

    return this.walletCache[id];
  }

  public get(address: string) {
    const { index, change } = this.indexCache[address] || {};
    if (index === undefined || change === undefined) {
      return undefined;
    }
    return this.getByIndex(index, change);
  }

  public setStatusAndUtxos(
    address: string,
    status: string | null,
    utxos: Utxo[],
    rawHistory: TxI[],
    lastConfirmedHeight: number
  ) {
    const entry = this.get(address);
    if (!entry) {
      return;
    }

    const { index, change } = this.indexCache[address] || {};
    if (index === undefined || change === undefined) {
      return;
    }

    const key = `${this.walletId}-${index}-${change}`;
    this.walletCache[key].status = status;
    this.walletCache[key].utxos = utxos;
    this.walletCache[key].rawHistory = rawHistory;
    this.walletCache[key].lastConfirmedHeight = lastConfirmedHeight;

    this.persist();
  }
}
