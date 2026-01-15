import {
  assertSuccess,
  CashAddressNetworkPrefix,
  CashAddressType,
  deriveHdPathRelative,
  encodeCashAddress,
  hash160,
  HdPrivateNodeValid,
  HdPublicNodeValid,
  secp256k1,
} from "@bitauth/libauth";
import { Config } from "../config.js";
import { CacheProvider } from "./interface.js";
import { IndexedDbCache } from "./IndexedDbCache.js";
import { MemoryCache } from "./MemoryCache.js";
import { WebStorageCache } from "./WebStorageCache.js";
import { Utxo } from "../interface.js";

// export const addressCache: Record<string, {
//   privateKey: Uint8Array | undefined,
//   publicKey: Uint8Array,
//   publicKeyHash: Uint8Array,
//   index: number,
//   change: boolean,
// }> = {};

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
}

// export const getPrivateKey = (
//   hdNode: HdPrivateNodeValid,
//   addressIndex: number,
//   change: boolean,
// ): Uint8Array => {
//   const node = deriveHdPathRelative(
//     hdNode,
//     `${change ? 1 : 0}/${addressIndex}`
//   );

//   return node.privateKey;
// }

export interface WalletCacheI {
  init(): Promise<void>;
  persist(): Promise<void>;
  getByIndex(addressIndex: number, change: boolean): WalletCacheEntry;
  getByAddress(address: string): WalletCacheEntry | undefined;
  setStatusAndUtxos(
    address: string,
    status: string | null,
    utxos: Utxo[]
  ): void;
}

export class WalletCache implements WalletCacheI {
  private _storage: CacheProvider | undefined;
  private walletCache: Record<string, WalletCacheEntry> = {};
  private indexCache: Record<
    string,
    {
      index: number;
      change: boolean;
    }
  > = {};
  private timeouts: NodeJS.Timeout[] = [];

  get storage(): CacheProvider | undefined {
    if (
      !Config.UseMemoryCache &&
      !Config.UseLocalStorageCache &&
      !Config.UseIndexedDBCache
    ) {
      this._storage = undefined;
      return this._storage;
    }

    if (Config.UseMemoryCache && !(this._storage instanceof MemoryCache)) {
      this._storage = new MemoryCache();
      return this._storage;
    }

    if (
      Config.UseLocalStorageCache &&
      !(this._storage instanceof WebStorageCache)
    ) {
      this._storage = new WebStorageCache();
      return this._storage;
    }

    if (
      Config.UseIndexedDBCache &&
      !(this._storage instanceof IndexedDbCache)
    ) {
      this._storage = new IndexedDbCache();
      return this._storage;
    }

    return this._storage;
  }

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
    await this.storage?.init();
    const data = await this.storage?.getItem(`walletCache-${this.walletId}`);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.walletCache = parsed.walletCache || {};
        this.indexCache = parsed.indexCache || {};
      } catch (e) {
        // ignore
      }
    }
  }

  public async persist() {
    this.timeouts.map(clearTimeout);
    this.timeouts = [];

    this.storage?.setItem(
      `walletCache-${this.walletId}`,
      JSON.stringify({
        walletCache: this.walletCache,
        indexCache: this.indexCache,
      })
    );
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
      };

      this.indexCache[address] = {
        index: addressIndex,
        change,
      };

      // batch new data into a single writeout
      this.timeouts.push(
        setTimeout(() => {
          this.persist().catch(() => {});
        }, this.writeTimeout)
      );
    }

    return this.walletCache[id];
  }

  public getByAddress(address: string) {
    const { index, change } = this.indexCache[address] || {};
    if (index === undefined || change === undefined) {
      return undefined;
    }
    return this.getByIndex(index, change);
  }

  public setStatusAndUtxos(
    address: string,
    status: string | null,
    utxos: Utxo[]
  ) {
    const entry = this.getByAddress(address);
    if (!entry) {
      return;
    }

    const { index, change } = this.indexCache[address] || {};
    if (index === undefined || change === undefined) {
      return undefined;
    }

    const key = `${this.walletId}-${index}-${change}`;
    this.walletCache[key].status = status;
    this.walletCache[key].utxos = utxos;

    // batch new data into a single writeout
    this.timeouts.push(
      setTimeout(() => {
        this.persist().catch(() => {});
      }, this.writeTimeout)
    );
  }
}

// export const getAddressFromCache = (
//   walletId: string,
//   hdNode: HdPublicNodeValid | HdPrivateNodeValid,
//   networkPrefix: string,
//   addressIndex: number,
//   change: boolean,
// ): WalletCacheEntry => {

// };
