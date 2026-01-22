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
import { WalletCache, WalletCacheI } from "../cache/index.js";
import { Config } from "../config.js";
import { NetworkType, prefixFromNetworkMap, UnitEnum } from "../enum.js";
import { getHistory } from "../history/getHistory.js";
import { TransactionHistoryItem } from "../history/interface.js";
import { Utxo } from "../interface.js";
import { checkForEmptySeed } from "../util/checkForEmptySeed.js";
import { _checkContextSafety, BaseWallet } from "./Base.js";
import { WalletTypeEnum } from "./enum.js";
import { CancelFn, SendRequestOptionsI, WalletInfoI } from "./interface.js";
import {
  OpReturnData,
  SendRequest,
  SendRequestArray,
  TokenSendRequest,
} from "./model.js";
import { arrayRange, getNextUnusedIndex } from "../util/hd.js";
import { DUST_UTXO_THRESHOLD } from "../constant.js";
import { sumUtxoValue } from "../util/sumUtxoValue.js";

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
  depositIndex?: number;
  changeIndex?: number;
  mnemonic?: string;
  derivation?: string;
  xPriv?: string;
  xPub?: string;
}

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

  // max index used for deposit address derivation
  depositIndex: number = 0;
  // max index used for change address derivation
  changeIndex: number = 0;

  depositStatusCallbacks: Array<(status: string) => void> = [];
  changeStatusCallbacks: Array<(status: string) => void> = [];

  depositWatchCancels: Array<CancelFn> = [];
  changeWatchCancels: Array<CancelFn> = [];

  depositStatuses: Array<string | null> = [];
  changeStatuses: Array<string | null> = [];

  depositUtxos: Array<Utxo[]> = [];
  changeUtxos: Array<Utxo[]> = [];

  watchPromise?: Promise<any[]> = undefined;

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
    depositIndex = 0,
    changeIndex = 0,
    mnemonic = undefined,
    derivation = undefined,
    xPriv = undefined,
    xPub = undefined,
  }: HDWalletOptions = {}) {
    // newRandom
    if (!xPriv && !xPub && !mnemonic) {
      mnemonic = generateBip39Mnemonic();
    }

    this.depositIndex = depositIndex;
    this.changeIndex = changeIndex;

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
        })
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
        })
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
          })`
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
        })
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
          })`
        );
      }

      // @ts-ignore
      this.xPubNode = decoded.node;
      // @ts-ignore
      this.xPub = xPub;
    } else {
      throw new Error(
        "mnemonic, xPriv or xPub must be provided to create an HDWallet"
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
          }-${this.network}`
        )
      )
    );
    // @ts-ignore
    this.walletCache = new WalletCache(
      this.walletId,
      this.xPrivNode ?? this.xPubNode,
      this.networkPrefix
    );

    // init wallet cache
    await this.walletCache.init();
    // start watching addresses asynchronously
    this.makeWatchPromise().catch(() => {});

    return this;
  }

  /// Stops the wallet from watching for address changes
  /// After calling this method, the wallet will no longer update and is considered defunct
  public async stop() {
    await Promise.all(
      [...this.depositWatchCancels, ...this.changeWatchCancels].map(
        (cancelFn) => cancelFn?.()
      )
    );
  }

  /// Scan more addresses for activity beyond the current gap limit, extending the watched range as needed
  public async scanMoreAddresses(amount: number = GAP_SIZE) {
    await this.watchPromise;

    await this.makeWatchPromise(amount);
    await this.watchPromise;
  }

  /// Internal method to start watching addresses for activity, extending the watched range as needed
  private async makeWatchPromise(gapSize: number = GAP_SIZE) {
    await this.watchPromise;

    this.watchPromise = Promise.all([
      (async () => {
        const depositIndex = this.depositIndex;
        const depositStartIndex =
          (this.depositStatuses
            .filter((s) => s)
            .map((_, i) => i)
            .at(-1) ?? -1) + 1;
        const depositStopIndex = Math.max(
          this.depositIndex,
          depositStartIndex + gapSize
        );

        const depositAddresses = arrayRange(
          depositStartIndex,
          depositStopIndex
        ).map((i) => this.walletCache.getByIndex(i, false).address);

        await Promise.all(
          depositAddresses.map(
            async (addr, index) =>
              new Promise<void>(async (resolve) => {
                index = depositStartIndex + index;

                if (this.depositStatuses[index] !== undefined) {
                  resolve();
                }

                const { status: prevStatus, utxos: prevUtxos } =
                  this.walletCache.getByIndex(index, false);
                this.depositStatuses[index] = prevStatus;
                this.depositUtxos[index] = prevUtxos;

                const callback = async (
                  args: [address: string, status: string | null]
                ) => {
                  const [address, status] = args;
                  if (address != addr) {
                    return;
                  }

                  if (status === null) {
                    this.depositUtxos[index] = [];
                  }

                  if (
                    status !== null &&
                    status !== this.depositStatuses[index]
                  ) {
                    const utxos = (await this.provider.getUtxos(addr)).map(
                      (utxo) => {
                        utxo.address = addr;
                        return utxo;
                      }
                    );
                    this.depositUtxos[index] = utxos;
                    this.walletCache.setStatusAndUtxos(addr, status, utxos);

                    const newDepositIndex = Math.max(depositIndex, index + 1);
                    if (newDepositIndex > depositIndex) {
                      this.depositIndex = Math.max(
                        newDepositIndex,
                        this.depositIndex
                      );
                      this.makeWatchPromise();
                    }
                  }
                  this.depositStatuses[index] = status;
                  resolve();
                };

                this.depositWatchCancels[index] =
                  await this.provider.subscribeToAddress(addr, callback as any);
              })
          )
        );
        return depositAddresses.length;
      })(),

      (async () => {
        const changeIndex = this.changeIndex;
        const changeStartIndex =
          (this.changeStatuses
            .filter((s) => s)
            .map((_, i) => i)
            .at(-1) ?? -1) + 1;
        const changeStopIndex = Math.max(
          this.changeIndex,
          changeStartIndex + gapSize
        );

        const changeAddresses = arrayRange(
          changeStartIndex,
          changeStopIndex
        ).map((i) => this.walletCache.getByIndex(i, true).address);

        await Promise.all(
          changeAddresses.map(
            async (addr, index) =>
              new Promise<void>(async (resolve) => {
                index = changeStartIndex + index;

                if (this.changeStatuses[index] !== undefined) {
                  resolve();
                }

                const { status: prevStatus, utxos: prevUtxos } =
                  this.walletCache.getByIndex(index, false);
                this.changeStatuses[index] = prevStatus;
                this.changeUtxos[index] = prevUtxos;

                const callback = async (
                  args: [address: string, status: string | null]
                ) => {
                  const [address, status] = args;
                  if (address != addr) {
                    return;
                  }

                  if (status === null) {
                    this.changeUtxos[index] = [];
                  }

                  if (
                    status !== null &&
                    status !== this.changeStatuses[index]
                  ) {
                    const utxos = (await this.provider.getUtxos(addr)).map(
                      (utxo) => {
                        utxo.address = addr;
                        return utxo;
                      }
                    );
                    this.changeUtxos[index] = utxos;
                    this.walletCache.setStatusAndUtxos(addr, status, utxos);

                    const newChangeIndex = Math.max(changeIndex, index + 1);
                    if (newChangeIndex > changeIndex) {
                      this.changeIndex = Math.max(
                        newChangeIndex,
                        this.changeIndex
                      );
                      this.makeWatchPromise();
                    }
                  }
                  this.changeStatuses[index] = status;
                  resolve();
                };

                this.changeWatchCancels[index] =
                  await this.provider.subscribeToAddress(addr, callback as any);
              })
          )
        );

        return changeAddresses.length;
      })(),
    ]);
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

  /**
   * utxos Get unspent outputs for the wallet
   *
   */
  public async getUtxos() {
    await this.watchPromise;

    const utxos = [...this.depositUtxos, ...this.changeUtxos].flat();

    return this._slpSemiAware
      ? utxos.filter((u) => u.satoshis > DUST_UTXO_THRESHOLD)
      : utxos;
  }

  // Gets balance by summing value in all utxos in sats
  // Balance includes DUST utxos which could be slp tokens and also cashtokens with BCH amounts
  public async getBalance(): Promise<bigint> {
    await this.watchPromise;

    const utxos = [...this.depositUtxos, ...this.changeUtxos].flat();
    return sumUtxoValue(utxos);
  }

  /// Get next unused deposit address, or the address at the specified index
  public getDepositAddress(index: number = -1): string {
    index = getNextUnusedIndex(index, this.depositStatuses);

    return this.walletCache.getByIndex(index, false).address;
  }

  /// Get next unused token deposit address, or the token address at the specified index
  public getTokenDepositAddress(index: number = -1): string {
    index = getNextUnusedIndex(index, this.depositStatuses);

    return this.walletCache.getByIndex(index, false).tokenAddress;
  }

  /// Get next unused change address, or the address at the specified index
  public getChangeAddress(index: number = -1): string {
    index = getNextUnusedIndex(index, this.changeStatuses);

    return this.walletCache.getByIndex(index, true).address;
  }

  /// Get next unused token change address, or the token address at the specified index
  public getChangeTokenAddress(index: number = -1): string {
    index = getNextUnusedIndex(index, this.changeStatuses);

    return this.walletCache.getByIndex(index, true).tokenAddress;
  }

  /**
   * fromSeed - create a wallet using the seed phrase and derivation path
   *
   * unless specified the derivation path m/44'/0'/0'/0/0 will be used
   *
   * @param seed   BIP39 12 word seed phrase
   * @param derivationPath BIP44 HD wallet derivation path to get a single the private key from hierarchy
   *
   * @returns instantiated wallet
   */
  public static async fromSeed<T extends typeof HDWallet>(
    this: T,
    seed: string,
    derivationPath?: string,
    depositIndex?: number,
    changeIndex?: number
  ): Promise<InstanceType<T>> {
    return new this().initialize({
      mnemonic: seed,
      derivation: derivationPath,
      depositIndex: depositIndex,
      changeIndex: changeIndex,
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
    dbName?: string
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
    xPub: string
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
    xPriv: string
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
    walletId: string
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
        `fromId called on a ${walletType} wallet, expected a ${WalletTypeEnum.Hd} wallet`
      );
    }

    if (arg1.startsWith("priv", 1)) {
      return this.initialize({
        xPriv: arg1,
        depositIndex: parseInt(arg2) || 0,
        changeIndex: parseInt(arg3) || 0,
      });
    }

    if (arg1.startsWith("pub", 1)) {
      return this.initialize({
        xPub: arg1,
        depositIndex: parseInt(arg2) || 0,
        changeIndex: parseInt(arg3) || 0,
      });
    }

    return this.initialize({
      mnemonic: arg1,
      derivation: arg2,
      depositIndex: parseInt(arg3) || 0,
      changeIndex: parseInt(arg4) || 0,
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
    privateKey?: Uint8Array
  ) {
    if (!this.xPriv && !privateKey && options?.buildUnsigned !== true) {
      throw new Error(`Missing private key`);
    }

    return super.encodeTransaction(
      requests,
      discardChange,
      options,
      privateKey
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
      if (this.mnemonic?.length > 0) {
        return `${this.walletType}:${this.network}:${this.mnemonic}:${this.derivation}:${this.depositIndex}:${this.changeIndex}`;
      }

      if (this.xPriv?.length > 0) {
        return `${this.walletType}:${this.network}:${this.xPriv}:${this.depositIndex}:${this.changeIndex}`;
      }

      if (this.xPub?.length > 0) {
        return `${this.walletType}:${this.network}:${this.xPub}:${this.depositIndex}:${this.changeIndex}`;
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
    const addresses = [
      ...this.depositStatuses
        .map((status, i) =>
          status !== null && i < this.depositIndex
            ? this.walletCache.getByIndex(i, false).address
            : undefined
        )
        .filter((address) => address !== undefined),
      ...this.changeStatuses
        .map((status, i) =>
          status !== null && i < this.depositIndex
            ? this.walletCache.getByIndex(i, true).address
            : undefined
        )
        .filter((address) => address !== undefined),
    ];

    return getHistory({
      addresses: addresses,
      provider: this.provider,
      unit,
      fromHeight,
      toHeight,
      start,
      count,
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
