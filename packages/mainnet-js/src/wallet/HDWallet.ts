import {
  assertSuccess,
  binToHex,
  CashAddressNetworkPrefix,
  decodeHdPrivateKey,
  decodeHdPublicKey,
  deriveHdPath,
  deriveHdPrivateNodeFromSeed,
  deriveHdPublicNode,
  deriveSeedFromBip39Mnemonic,
  encodeHdPrivateKey,
  encodeHdPublicKey,
  generateBip39Mnemonic,
  HdPrivateNodeValid,
  HdPublicNodeValid,
  sha256,
  utf8ToBin,
} from "@bitauth/libauth";
import { HDWalletCache, WalletCacheI } from "../cache/index.js";
import { Config } from "../config.js";
import { DUST_UTXO_THRESHOLD } from "../constant.js";
import { NetworkType, prefixFromNetworkMap, UnitEnum } from "../enum.js";
import { getHistory } from "../history/getHistory.js";
import { TransactionHistoryItem } from "../history/interface.js";
import { TxI, Utxo } from "../interface.js";
import { checkForEmptySeed } from "../util/checkForEmptySeed.js";
import { arrayRange, getNextUnusedIndex } from "../util/hd.js";
import { sumUtxoValue } from "../util/sumUtxoValue.js";
import { BaseWallet } from "./Base.js";
import { WalletTypeEnum } from "./enum.js";
import { CancelFn, SendRequestOptionsI, WalletInfoI } from "./interface.js";
import {
  OpReturnData,
  SendRequest,
  SendRequestArray,
  TokenSendRequest,
} from "./model.js";

export const GAP_SIZE = 20;

export interface HDWalletEvents {
  /**
   * Emitted when data has been received over the socket.
   * @eventProperty
   */
  data: [string];
}

export interface HDWalletOptions {
  name?: string;
  /**
   * Integer branches to track. Each branch `N` derives addresses at relative
   * path `N/i` (where `i` is the address index). Default `[0, 1]` -- deposit
   * (0) and change (1) -- matching the BIP-44 convention.
   *
   * Wallets rooted at a depth-4 (change-level) node have a single chain of
   * addresses and ignore this option; their `branches` is fixed at `[0]`.
   *
   * Must contain at least one branch.
   */
  branches?: number[];
  /** Initial per-branch indices (max-used index). */
  indices?: Record<number, number>;
  mnemonic?: string;
  derivation?: string;
  xPriv?: string;
  xPub?: string;
}

export const DEFAULT_BRANCHES: readonly number[] = [0, 1];
/** Branch convention: 0 = deposit (external), 1 = change (internal). */
export const DEPOSIT_BRANCH = 0;
export const CHANGE_BRANCH = 1;

export class HDWallet extends BaseWallet {
  static networkPrefix = CashAddressNetworkPrefix.mainnet;

  readonly mnemonic!: string;
  readonly derivation: string = Config.DefaultParentDerivationPath;
  readonly walletId!: string;
  declare readonly walletCache: WalletCacheI;

  readonly xPriv!: string;
  readonly xPub!: string;

  readonly xPrivNode!: HdPrivateNodeValid;
  readonly xPubNode!: HdPublicNodeValid;

  // Callback type for wallet activity watching
  private walletWatchCallbacks: Array<
    (status: string | null, address: string) => void
  > = [];

  /**
   * Integer branches this wallet tracks. Set at construction; defaults to
   * `[0, 1]` (deposit, change). Wallets rooted at a depth-4 node have a
   * single chain and use `[0]`.
   */
  branches!: ReadonlyArray<number>;

  /**
   * True when the wallet is rooted at a depth-4 (change-level) XPub/XPriv.
   * Only one address chain is reachable; the cache is queried with the bare
   * address index instead of `${branch}/${index}`.
   */
  public singleBranch: boolean = false;

  /** Per-branch: max index used for address derivation. */
  indices: Map<number, number> = new Map();
  /** Per-branch: address status array (length = watched window). */
  statuses: Map<number, Array<string | null>> = new Map();
  /** Per-branch: cached UTXOs per address index. */
  utxos: Map<number, Array<Utxo[]>> = new Map();
  /** Per-branch: cached raw history per address index. */
  rawHistory: Map<number, Array<TxI[]>> = new Map();
  /** Per-branch: subscription cancel functions per address index. */
  watchCancels: Map<number, Array<CancelFn>> = new Map();

  watchPromise?: Promise<any> = undefined;

  public get networkPrefix(): CashAddressNetworkPrefix {
    return prefixFromNetworkMap[this.network];
  }

  /// Create an uninitialized HDWallet, this method should not be called directly
  /// Instead static methods such as `newRandom` or `fromSeed` should be used
  constructor(network: NetworkType = NetworkType.Mainnet) {
    super(network);

    // @ts-ignore
    this.walletType = WalletTypeEnum.Hd;
  }

  /// Initialize the wallet given the options mnemonic, xPriv or xPub
  /// If none provided, a new random mnemonic will be generated
  /// If mnemonic or xPriv provided, the wallet will be able to sign transactions
  /// If xPub provided, the wallet will be watch-only
  /// This internal method is called by the various static constructors
  protected async initialize({
    name = "",
    branches,
    indices,
    mnemonic = undefined,
    derivation = undefined,
    xPriv = undefined,
    xPub = undefined,
  }: HDWalletOptions = {}) {
    // newRandom
    if (!xPriv && !xPub && !mnemonic) {
      mnemonic = generateBip39Mnemonic();
    }

    if (branches !== undefined && branches.length === 0) {
      throw new Error("HDWallet: `branches` must contain at least one entry");
    }

    // @ts-ignore
    this.xPub = xPub ? xPub : "";

    if (mnemonic?.length) {
      // @ts-ignore
      this.derivation = derivation
        ? derivation
        : Config.DefaultParentDerivationPath;
      // @ts-ignore
      this.mnemonic = mnemonic ? mnemonic : generateBip39Mnemonic();

      if (this.mnemonic.length == 0) {
        throw Error("refusing to create wallet from empty mnemonic");
      }
      if (![12, 24].includes(this.mnemonic.split(" ").length)) {
        throw Error("Invalid mnemonic, must be 12 or 24 words");
      }

      const seed = deriveSeedFromBip39Mnemonic(this.mnemonic);
      checkForEmptySeed(seed);

      const rootNode = deriveHdPrivateNodeFromSeed(seed, {
        assumeValidity: true,
        throwErrors: true,
      });
      const node = deriveHdPath(rootNode, this.derivation);
      // @ts-ignore
      this.xPriv = assertSuccess(
        encodeHdPrivateKey({
          ...node,
          network: this.network === NetworkType.Mainnet ? "mainnet" : "testnet",
          node: node,
        }),
      ).hdPrivateKey;
      // @ts-ignore
      this.xPrivNode = node;

      // @ts-ignore
      this.xPubNode = deriveHdPublicNode(node);
      // @ts-ignore
      this.xPub = assertSuccess(
        encodeHdPublicKey({
          node: this.xPubNode,
          network: this.network === NetworkType.Mainnet ? "mainnet" : "testnet",
        }),
      ).hdPublicKey;
    } else if (xPriv) {
      // @ts-ignore
      this.xPriv = xPriv;

      const decoded = assertSuccess(decodeHdPrivateKey(xPriv));
      if (
        decoded.network !==
        (this.network === NetworkType.Mainnet ? "mainnet" : "testnet")
      ) {
        throw new Error(
          `xPriv network (${decoded.network}) does not match wallet network (${
            this.network === NetworkType.Mainnet ? "mainnet" : "testnet"
          })`,
        );
      }
      // @ts-ignore
      this.xPrivNode = decoded.node;

      // @ts-ignore
      this.xPubNode = deriveHdPublicNode(decoded.node);
      // @ts-ignore
      this.xPub = assertSuccess(
        encodeHdPublicKey({
          node: this.xPubNode,
          network: this.network === NetworkType.Mainnet ? "mainnet" : "testnet",
        }),
      ).hdPublicKey;
    } else if (xPub) {
      const decoded = assertSuccess(decodeHdPublicKey(xPub));
      if (
        decoded.network !==
        (this.network === NetworkType.Mainnet ? "mainnet" : "testnet")
      ) {
        throw new Error(
          `xPriv network (${decoded.network}) does not match wallet network (${
            this.network === NetworkType.Mainnet ? "mainnet" : "testnet"
          })`,
        );
      }

      // @ts-ignore
      this.xPubNode = decoded.node;
      // @ts-ignore
      this.xPub = xPub;
    } else {
      throw new Error(
        "mnemonic, xPriv or xPub must be provided to create an HDWallet",
      );
    }

    this.name = name;

    // @ts-ignore
    this.walletId = binToHex(
      sha256.hash(
        utf8ToBin(
          `${
            (this.mnemonic ? this.mnemonic + this.derivation : undefined) ??
            this.xPriv ??
            this.xPub
          }-${this.network}`,
        ),
      ),
    );
    // Resolve the effective branches.
    const cacheNode = this.xPrivNode ?? this.xPubNode;
    if (cacheNode.depth > 4) {
      throw new Error(
        `HDWallet: HD node depth ${cacheNode.depth} is too deep; address-level keys cannot derive further children`,
      );
    }
    this.singleBranch = cacheNode.depth === 4;
    if (this.singleBranch) {
      // Depth-4 wallets are a single chain; the branch axis doesn't apply.
      // We expose a `[0]` branch list so the rest of the wallet code can treat
      // them uniformly (with derivation taking the bare index, no prefix).
      this.branches = Object.freeze([0]);
    } else {
      this.branches = Object.freeze(
        branches !== undefined ? [...branches] : [...DEFAULT_BRANCHES],
      );
    }
    for (const branch of this.branches) {
      this.indices.set(branch, indices?.[branch] ?? 0);
      this.statuses.set(branch, []);
      this.utxos.set(branch, []);
      this.rawHistory.set(branch, []);
      this.watchCancels.set(branch, []);
    }

    // @ts-ignore
    this.walletCache = new HDWalletCache(
      this.walletId,
      cacheNode,
      this.networkPrefix,
    );

    // init wallet cache
    await this.walletCache.init();
    // start watching addresses asynchronously
    this.watchPromise = this.makeWatchPromise().catch(() => {});

    return this;
  }

  /// Stops the wallet from watching for address changes
  /// After calling this method, the wallet will no longer update and is considered defunct
  public override async stop() {
    const cancels: Array<Promise<void> | void> = [super.stop()];
    for (const branch of this.branches) {
      for (const fn of this.watchCancels.get(branch) ?? []) {
        cancels.push(fn?.());
      }
    }
    await Promise.all(cancels);
    for (const branch of this.branches) {
      this.watchCancels.set(branch, []);
    }
    this.walletWatchCallbacks = [];
  }

  /// Scan more addresses for activity beyond the current gap limit, extending the watched range as needed
  public async scanMoreAddresses(amount: number = GAP_SIZE) {
    await this.watchPromise;
    this.watchPromise = this.makeWatchPromise(amount);
    await this.watchPromise;
  }

  /// Internal method to start watching addresses for activity, extending the watched range as needed
  private async makeWatchPromise(gapSize: number = GAP_SIZE) {
    await this.watchPromise;

    let needsMore = true;
    while (needsMore) {
      await Promise.all(
        this.branches.map((branch) => this.watchBranch(branch, gapSize)),
      );

      // Check if we have a full gap of addresses beyond the last used index
      // for every tracked branch.
      needsMore = this.branches.some((branch) => {
        const gap =
          (this.statuses.get(branch)?.length ?? 0) -
          (this.indices.get(branch) ?? 0);
        return gap < gapSize;
      });
    }
  }

  /// Watch addresses of a specific branch for activity
  private async watchBranch(branch: number, gapSize: number): Promise<number> {
    const statuses = this.statuses.get(branch)!;
    const utxosArray = this.utxos.get(branch)!;
    const historyArray = this.rawHistory.get(branch)!;
    const watchCancels = this.watchCancels.get(branch)!;
    const getCurrentIndex = () => this.indices.get(branch) ?? 0;
    const setCurrentIndex = (val: number) => {
      this.indices.set(branch, val);
    };

    const startIndex = statuses.length;
    const stopIndex = getCurrentIndex() + gapSize;

    const addresses = arrayRange(startIndex, stopIndex).map(
      (i) => this.walletCache.getByPath(this.addressPath(branch, i)).address,
    );

    await Promise.all(
      addresses.map(
        async (addr, idx) =>
          new Promise<void>(async (resolve) => {
            const index = startIndex + idx;

            if (statuses[index] !== undefined) {
              resolve();
              return;
            }

            const {
              status: prevStatus,
              utxos: prevUtxos,
              rawHistory: prevRawHistory,
              lastConfirmedHeight: prevLastConfirmedHeight,
            } = this.walletCache.getByPath(this.addressPath(branch, index));
            statuses[index] = prevStatus;
            utxosArray[index] = prevUtxos;
            historyArray[index] = prevRawHistory;

            // Track lastConfirmedHeight in closure, updated after each fetch
            let lastConfirmedHeight = prevLastConfirmedHeight;

            const callback = async (
              args: [address: string, status: string | null],
            ) => {
              const [address, status] = args;
              if (address != addr) {
                return;
              }

              if (status === null) {
                utxosArray[index] = [];
                historyArray[index] = [];
              }

              if (status !== null && status !== statuses[index]) {
                // Use lastConfirmedHeight from closure for incremental fetch
                const fromHeight = lastConfirmedHeight;
                const currentHistory = historyArray[index] || [];

                const [utxos, newHistory] = await Promise.all([
                  this.provider.getUtxos(addr).then((utxos) =>
                    utxos.map((utxo) => {
                      utxo.address = addr;
                      return utxo;
                    }),
                  ),
                  // Fetch only from last confirmed height to reduce server load
                  this.provider.getHistory(addr, fromHeight),
                ]);

                // Merge: keep confirmed items from current history, add new items
                const confirmedFromHistory = currentHistory.filter(
                  (tx) => tx.height > 0 && tx.height < fromHeight,
                );
                const seen = new Set(
                  confirmedFromHistory.map((tx) => tx.tx_hash),
                );
                const merged = [...confirmedFromHistory];
                for (const tx of newHistory) {
                  if (!seen.has(tx.tx_hash)) {
                    seen.add(tx.tx_hash);
                    merged.push(tx);
                  }
                }

                // Update lastConfirmedHeight in closure
                lastConfirmedHeight = merged.reduce(
                  (max, tx) => (tx.height > 0 ? Math.max(max, tx.height) : max),
                  fromHeight,
                );

                utxosArray[index] = utxos;
                historyArray[index] = merged;
                this.walletCache.setStatusAndUtxos(
                  addr,
                  status,
                  utxos,
                  merged,
                  lastConfirmedHeight,
                );
              }
              statuses[index] = status;

              if (status !== null) {
                const newIndex = index + 1;
                if (newIndex > getCurrentIndex()) {
                  setCurrentIndex(newIndex);
                }

                // Maintain the gap: extend watched range if it shrank
                const gap = statuses.length - getCurrentIndex();
                if (gap < gapSize) {
                  await this.watchBranch(branch, gapSize);
                }
              }

              // Notify wallet watchers of the status change
              this.notifyWalletWatchers(status, addr);

              resolve();
            };

            watchCancels[index] = await this.provider.subscribeToAddress(
              addr,
              callback as any,
            );
          }),
      ),
    );

    return addresses.length;
  }

  // Return wallet info
  public getInfo(): WalletInfoI {
    return {
      isTestnet: this.isTestnet,
      name: this.name,
      network: this.network as any,
      seed: this.mnemonic,
      walletId: this.toString(),
      walletDbEntry: this.toDbString(),
    };
  }

  /// Internal method called when any address status changes
  private notifyWalletWatchers(status: string | null, address: string) {
    for (const callback of this.walletWatchCallbacks) {
      try {
        callback(status, address);
      } catch (e) {
        // Ignore callback errors to not break other watchers
      }
    }
  }

  /**
   * Watch wallet for any activity (status changes on any address)
   * This is the foundation for watchWalletBalance and watchWalletTransactions
   * @param callback - Called when any address in the wallet has a status change
   * @returns Cancel function to stop watching
   */
  public async watchStatus(
    callback: (status: string | null, address: string) => void,
    debounce: number = 100,
  ): Promise<CancelFn> {
    await this.watchPromise;

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let pendingStatus: string | null = null;
    let pendingAddress: string = "";

    const debouncedCallback = (status: string | null, address: string) => {
      pendingStatus = status;
      pendingAddress = address;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = undefined;
        callback(pendingStatus, pendingAddress);
      }, debounce);
    };

    this.walletWatchCallbacks.push(debouncedCallback);

    return async () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      const index = this.walletWatchCallbacks.indexOf(debouncedCallback);
      if (index > -1) {
        this.walletWatchCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Wait until the wallet's per-branch indices reach the specified targets,
   * or until an idle-timeout window passes with no further status changes.
   *
   * Targets may be supplied either via the back-compat `depositIndex` /
   * `changeIndex` (branches 0 and 1) or via the generalised `indices` map
   * keyed by branch number. All forms are merged before checking.
   */
  public async waitForUpdate(
    options: {
      /** Target index for branch 0 (deposit). Convenience alias for `indices: { 0: depositIndex }`. */
      depositIndex?: number;
      /** Target index for branch 1 (change). Convenience alias for `indices: { 1: changeIndex }`. */
      changeIndex?: number;
      /** Target indices keyed by branch number. Wait until each tracked branch
       *  has reached at least the specified index. */
      indices?: Record<number, number>;
      timeout?: number;
    } = {},
  ): Promise<void> {
    const timeout = options.timeout ?? 100;

    const targets: Record<number, number> = { ...(options.indices ?? {}) };
    if (options.depositIndex !== undefined) {
      targets[DEPOSIT_BRANCH] = options.depositIndex;
    }
    if (options.changeIndex !== undefined) {
      targets[CHANGE_BRANCH] = options.changeIndex;
    }

    const isSatisfied = () => {
      for (const [branch, target] of Object.entries(targets)) {
        const current = this.indices.get(Number(branch)) ?? 0;
        if (current < target) return false;
      }
      return true;
    };

    if (isSatisfied()) return;

    // Single watcher that resolves a rotating promise on each status change
    let statusResolve: () => void;
    const cancel = await this.watchStatus(() => {
      statusResolve?.();
    });

    // Race status changes against idle timeout; reset timeout on each change
    while (!isSatisfied()) {
      const statusChange = new Promise<"status">((resolve) => {
        statusResolve = () => resolve("status");
      });
      const idle = new Promise<"idle">((resolve) =>
        setTimeout(resolve, timeout, "idle"),
      );

      if ((await Promise.race([statusChange, idle])) === "idle") break;
    }

    await cancel();
  }

  /**
   * Watch wallet for new transactions (HD wallet override)
   *
   * Uses unfiltered history so that seenTxHashes always covers all known
   * transactions, including those from newly discovered addresses when any
   * tracked branch's index advances and widens getRawHistory's scope.
   */
  public override async watchTransactionHashes(
    callback: (txHash: string) => void,
  ): Promise<CancelFn> {
    const seenTxHashes = new Set<string>();

    return this.watchStatus(async () => {
      const history = await this.getRawHistory();

      const newTxHashes: string[] = [];

      for (const tx of history) {
        if (!seenTxHashes.has(tx.tx_hash)) {
          seenTxHashes.add(tx.tx_hash);
          newTxHashes.push(tx.tx_hash);
        }
      }

      if (newTxHashes.length > 0) {
        newTxHashes.forEach((txHash) => callback(txHash));
      }
    });
  }

  /// Branch indices to scan. Defaults to every tracked branch. Throws on
  /// empty array or branches the wallet does not track.
  private resolveBranches(branches?: number[]): number[] {
    if (branches === undefined) return [...this.branches];
    if (branches.length === 0) {
      throw new Error("HDWallet: `branches` filter must not be empty");
    }
    for (const branch of branches) {
      this.requireBranch(branch);
    }
    return branches;
  }

  /// Collect cached UTXOs from the given branches (default: all tracked).
  private collectUtxosFromBranches(branches?: number[]): Utxo[] {
    const list = this.resolveBranches(branches);
    const out: Utxo[] = [];
    for (const branch of list) {
      for (const arr of this.utxos.get(branch) ?? []) {
        out.push(...arr);
      }
    }
    return out;
  }

  /**
   * utxos Get unspent outputs for the wallet.
   *
   * @param options.branches Restrict to the listed branches. Default: every
   *   tracked branch. Empty array throws.
   */
  public async getUtxos(options: { branches?: number[] } = {}) {
    await this.watchPromise;

    const utxos = this.collectUtxosFromBranches(options.branches);

    return this._slpSemiAware
      ? utxos.filter((u) => u.satoshis > DUST_UTXO_THRESHOLD)
      : utxos;
  }

  // Gets balance by summing value in all utxos in sats
  // Balance includes DUST utxos which could be slp tokens and also cashtokens with BCH amounts
  public async getBalance(
    options: { branches?: number[] } = {},
  ): Promise<bigint> {
    await this.watchPromise;

    const utxos = this.collectUtxosFromBranches(options.branches);
    return sumUtxoValue(utxos);
  }

  /// Relative derivation path for an address slot. Single-branch (depth-4)
  /// wallets ignore the branch component and derive at just the address
  /// index. Otherwise the standard `${branch}/${index}` convention is used.
  private addressPath(branch: number, index: number): string {
    return this.singleBranch ? `${index}` : `${branch}/${index}`;
  }

  /// Throw if the wallet does not track the requested branch.
  private requireBranch(branch: number): void {
    if (!this.branches.includes(branch)) {
      throw new Error(
        `HDWallet: branch ${branch} is not tracked (tracked: [${this.branches.join(", ")}])`,
      );
    }
  }

  /**
   * Get the address at the given branch and index. If `index` is `-1`
   * (the default), the next unused index on that branch is selected.
   *
   * Throws if the branch is not tracked by this wallet.
   */
  public getAddressByBranch(branch: number, index: number = -1): string {
    this.requireBranch(branch);
    const statuses = this.statuses.get(branch)!;
    index = getNextUnusedIndex(index, statuses);
    return this.walletCache.getByPath(this.addressPath(branch, index)).address;
  }

  /** Same as {@link getAddressByBranch} but returning the token-address form. */
  public getTokenAddressByBranch(branch: number, index: number = -1): string {
    this.requireBranch(branch);
    const statuses = this.statuses.get(branch)!;
    index = getNextUnusedIndex(index, statuses);
    return this.walletCache.getByPath(this.addressPath(branch, index))
      .tokenAddress;
  }

  /// Get next unused deposit address (branch 0), or the address at the
  /// specified index. Convenience alias for `getAddressByBranch(0, index)`.
  public getDepositAddress(index: number = -1): string {
    return this.getAddressByBranch(DEPOSIT_BRANCH, index);
  }

  /// Get next unused token deposit address (branch 0), or the token address
  /// at the specified index.
  public getTokenDepositAddress(index: number = -1): string {
    return this.getTokenAddressByBranch(DEPOSIT_BRANCH, index);
  }

  /// Get next unused change address (branch 1), or the address at the
  /// specified index. For depth-4 (single-branch) wallets branch 1 is not
  /// tracked; the deposit branch is used instead.
  public getChangeAddress(index: number = -1): string {
    if (this.singleBranch || !this.branches.includes(CHANGE_BRANCH)) {
      return this.getDepositAddress(index);
    }
    return this.getAddressByBranch(CHANGE_BRANCH, index);
  }

  /// Get next unused token change address (branch 1), or the token address at
  /// the specified index. For depth-4 (single-branch) wallets branch 1 is not
  /// tracked; the deposit branch is used instead.
  public getChangeTokenAddress(index: number = -1): string {
    if (this.singleBranch || !this.branches.includes(CHANGE_BRANCH)) {
      return this.getTokenDepositAddress(index);
    }
    return this.getTokenAddressByBranch(CHANGE_BRANCH, index);
  }

  public hasAddress(address: string): boolean {
    return this.walletCache.get(address) !== undefined;
  }

  /**
   * fromSeed - create a wallet using the seed phrase and derivation path.
   *
   * The default derivation path is `Config.DefaultParentDerivationPath`
   * (`m/44'/0'/0'` -- account level). Address derivation under that path is
   * controlled by the wallet's `branches` list (default `[0, 1]`).
   *
   * @param seed BIP39 mnemonic
   * @param derivationPath BIP44 derivation path applied to the seed (down to,
   *   typically, the account level). Defaults to `m/44'/0'/0'`.
   *
   * @returns instantiated wallet
   */
  public static async fromSeed<T extends typeof HDWallet>(
    this: T,
    seed: string,
    derivationPath?: string,
    depositIndex?: number,
    changeIndex?: number,
  ): Promise<InstanceType<T>> {
    const indices: Record<number, number> = {};
    if (depositIndex !== undefined) indices[DEPOSIT_BRANCH] = depositIndex;
    if (changeIndex !== undefined) indices[CHANGE_BRANCH] = changeIndex;
    return new this().initialize({
      mnemonic: seed,
      derivation: derivationPath,
      indices: Object.keys(indices).length ? indices : undefined,
    }) as Promise<InstanceType<T>>;
  }

  /**
   * newRandom - create a random wallet
   *
   * if `name` parameter is specified, the wallet will also be persisted to DB
   *
   * @param name   user friendly wallet alias
   * @param dbName name under which the wallet will be stored in the database
   *
   * @returns instantiated wallet
   */
  public static async newRandom<T extends typeof HDWallet>(
    this: T,
    name: string = "",
    dbName?: string,
  ): Promise<InstanceType<T>> {
    dbName = dbName ? dbName : this.networkPrefix;
    if (name.length > 0) {
      return this.named(name, dbName);
    }

    return new this().initialize() as Promise<InstanceType<T>>;
  }

  /**
   * fromXPub - create a watch-only wallet using the HD Wallet Public key
   *
   * @param xPub   HD Wallet Public Key
   *
   * @returns instantiated wallet
   */
  public static async fromXPub<T extends typeof HDWallet>(
    this: T,
    xPub: string,
  ): Promise<InstanceType<T>> {
    return new this().initialize({
      xPub: xPub,
    }) as Promise<InstanceType<T>>;
  }

  /**
   * fromXPriv - create a wallet using the HD Wallet Private key
   *
   * @param xPub   HD Wallet Private Key
   *
   * @returns instantiated wallet
   */
  public static async fromXPriv<T extends typeof HDWallet>(
    this: T,
    xPriv: string,
  ): Promise<InstanceType<T>> {
    return new this().initialize({
      xPriv: xPriv,
    }) as Promise<InstanceType<T>>;
  }

  /**
   * fromId - create a wallet from encoded walletId string
   *
   * @param walletId   walletId options to steer the creation process
   *
   * @returns wallet instantiated accordingly to the walletId rules
   */
  public static async fromId<T extends typeof HDWallet>(
    this: T,
    walletId: string,
  ): Promise<InstanceType<T>> {
    return new this().fromId(walletId) as InstanceType<T>;
  }

  /// override the base class fromId method implementation
  protected async fromId(walletId: string): Promise<this> {
    const [walletType, networkGiven, arg1, arg2, arg3, arg4] =
      walletId.split(":");

    if (this.network != networkGiven) {
      throw Error(`Network prefix ${networkGiven} to a ${this.network} wallet`);
    }

    if (walletType === WalletTypeEnum.Named) {
      if (arg2) {
        // named:testnet:wallet_1:my_database
        return this.named(arg1, arg2);
      } else {
        // named:testnet:wallet_1
        return this.named(arg1);
      }
    }

    if (walletType !== WalletTypeEnum.Hd) {
      throw Error(
        `fromId called on a ${walletType} wallet, expected a ${WalletTypeEnum.Hd} wallet`,
      );
    }

    if (arg1.startsWith("priv", 1)) {
      return this.initialize({
        xPriv: arg1,
        indices: {
          [DEPOSIT_BRANCH]: parseInt(arg2) || 0,
          [CHANGE_BRANCH]: parseInt(arg3) || 0,
        },
      });
    }

    if (arg1.startsWith("pub", 1)) {
      return this.initialize({
        xPub: arg1,
        indices: {
          [DEPOSIT_BRANCH]: parseInt(arg2) || 0,
          [CHANGE_BRANCH]: parseInt(arg3) || 0,
        },
      });
    }

    return this.initialize({
      mnemonic: arg1,
      derivation: arg2,
      indices: {
        [DEPOSIT_BRANCH]: parseInt(arg3) || 0,
        [CHANGE_BRANCH]: parseInt(arg4) || 0,
      },
    });
  }

  /**
   * encodeTransaction Encode and sign a transaction given a list of sendRequests, options and estimate fees.
   * @param  {SendRequest[]} sendRequests SendRequests
   * @param  {boolean} discardChange=false
   * @param  {SendRequestOptionsI} options Options of the send requests
   */
  public async encodeTransaction(
    requests:
      | SendRequest
      | TokenSendRequest
      | OpReturnData
      | Array<SendRequest | TokenSendRequest | OpReturnData>
      | SendRequestArray[],
    discardChange: boolean = false,
    options?: SendRequestOptionsI,
    privateKey?: Uint8Array,
  ) {
    if (!this.xPriv && !privateKey && options?.buildUnsigned !== true) {
      throw new Error(`Missing private key`);
    }

    return super.encodeTransaction(
      requests,
      discardChange,
      options,
      privateKey,
    );
  }

  //#region Serialization
  // Returns the serialized wallet as a string
  // If storing in a database, set asNamed to false to store secrets
  // In all other cases, the a named wallet is deserialized from the database
  // by the name key
  public toString() {
    if (this.name) {
      return `named:${this.network}:${this.name}`;
    }

    return this.toDbString();
  }

  /**
   * toDbString - store the serialized version of the wallet in the database, not just the name
   *
   * @throws {Error} if called on BaseWallet
   */
  public toDbString() {
    if (this.walletType == WalletTypeEnum.Hd) {
      // Serialize indices for branches 0 and 1 only -- the persisted format
      // pre-dates arbitrary-branch tracking. Non-default branches are not
      // serialized; if the wallet is restored, its branches list will revert
      // to the default and the extra branches will need to be re-supplied.
      const depositIdx = this.indices.get(DEPOSIT_BRANCH) ?? 0;
      const changeIdx = this.indices.get(CHANGE_BRANCH) ?? 0;
      if (this.mnemonic?.length > 0) {
        return `${this.walletType}:${this.network}:${this.mnemonic}:${this.derivation}:${depositIdx}:${changeIdx}`;
      }

      if (this.xPriv?.length > 0) {
        return `${this.walletType}:${this.network}:${this.xPriv}:${depositIdx}:${changeIdx}`;
      }

      if (this.xPub?.length > 0) {
        return `${this.walletType}:${this.network}:${this.xPub}:${depositIdx}:${changeIdx}`;
      }

      throw Error("HDWallet has no mnemonic, xPriv or xPub to serialize");
    }

    throw Error("toDbString unsupported wallet type");
  }
  //#endregion Serialization

  /**
   * getHistory gets transaction history of this wallet with most data decoded and ready to present to user
   * @note balance calculations are valid only if querying to the blockchain tip (`toHeight` === -1, `count` === -1)
   * @note this method is heavy on network calls, if invoked in browser use of cache is advised, @see `Config.UseLocalStorageCache`
   * @note this method tries to recreate the history tab view of Electron Cash wallet, however, it may not be 100% accurate if the tnransaction value changes are the same in the same block (ordering)
   *
   * @param unit optional, BCH or currency unit to present balance and balance changes. If unit is currency like USD or EUR, balances will be subject to possible rounding errors. Default 0
   * @param fromHeight optional, if set, history will be limited. Default 0
   * @param toHeight optional, if set, history will be limited. Default -1, meaning that all history items will be returned, including mempool
   * @param start optional, if set, the result set will be paginated with offset `start`
   * @param count optional, if set, the result set will be paginated with `count`. Default -1, meaning that all history items will be returned
   *
   * @returns an array of transaction history items, with input values and addresses encoded in cashaddress format. @see `TransactionHistoryItem` type
   */
  public async getHistory({
    unit = "sat",
    fromHeight = 0,
    toHeight = -1,
    start = 0,
    count = -1,
  }: {
    unit?: UnitEnum;
    fromHeight?: number;
    toHeight?: number;
    start?: number;
    count?: number;
  }): Promise<TransactionHistoryItem[]> {
    const rawHistory = await this.getRawHistory(fromHeight, toHeight);
    const addresses = this.getUsedAddresses();

    return getHistory({
      addresses: addresses,
      provider: this.provider,
      unit,
      fromHeight,
      toHeight,
      start,
      count,
      rawHistory,
    });
  }

  // get all used addresses across all tracked branches
  private getUsedAddresses(): string[] {
    const addrs: string[] = [];
    for (const branch of this.branches) {
      const statuses = this.statuses.get(branch) ?? [];
      const maxIdx = this.indices.get(branch) ?? 0;
      for (let i = 0; i < statuses.length; i++) {
        if (statuses[i] !== null && i < maxIdx) {
          addrs.push(
            this.walletCache.getByPath(this.addressPath(branch, i)).address,
          );
        }
      }
    }
    return addrs;
  }

  /**
   * Get the wallet's transaction history.
   *
   * @param options.branches Restrict to the listed branches. Default: every
   *   tracked branch. Empty array throws.
   */
  public async getRawHistory(
    fromHeight: number = 0,
    toHeight: number = -1,
    options: { branches?: number[] } = {},
  ): Promise<TxI[]> {
    await this.watchPromise;

    const list = this.resolveBranches(options.branches);
    const historyArrays: TxI[][] = [];
    for (const branch of list) {
      const arrs = this.rawHistory.get(branch) ?? [];
      const maxIdx = this.indices.get(branch) ?? 0;
      historyArrays.push(...arrs.slice(0, maxIdx));
    }

    // Deduplicate by tx_hash
    const seen = new Set<string>();
    let history: TxI[] = [];
    for (const arr of historyArrays) {
      for (const tx of arr) {
        if (!seen.has(tx.tx_hash)) {
          seen.add(tx.tx_hash);
          history.push(tx);
        }
      }
    }

    // Apply height filters if specified
    if (fromHeight > 0 || toHeight !== -1) {
      history = history.filter((tx) => {
        // Unconfirmed transactions (height <= 0) pass the filter when toHeight is -1
        if (tx.height <= 0) {
          return toHeight === -1;
        }
        const aboveFrom = tx.height >= fromHeight;
        const belowTo = toHeight === -1 || tx.height <= toHeight;
        return aboveFrom && belowTo;
      });
    }

    // Sort by height (descending, unconfirmed first)
    return history.sort((a, b) => {
      if (a.height <= 0 && b.height > 0) return -1;
      if (b.height <= 0 && a.height > 0) return 1;
      return b.height - a.height;
    });
  }
}

/**
 * Class to manage a testnet wallet.
 */
export class TestNetHDWallet extends HDWallet {
  static networkPrefix = CashAddressNetworkPrefix.testnet;
  constructor() {
    super(NetworkType.Testnet);
  }
}

/**
 * Class to manage a regtest wallet.
 */
export class RegTestHDWallet extends HDWallet {
  static networkPrefix = CashAddressNetworkPrefix.regtest;
  constructor() {
    super(NetworkType.Regtest);
  }
}
