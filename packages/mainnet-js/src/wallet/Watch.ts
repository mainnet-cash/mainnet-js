import {
  binToHex,
  CashAddressNetworkPrefix,
  decodeCashAddress,
  secp256k1,
  encodeCashAddress,
  assertSuccess,
  hash160,
  decodeCashAddressFormatWithoutPrefix,
} from "@bitauth/libauth";
import {
  networkPrefixMap,
  NetworkType,
  prefixFromNetworkMap,
  UnitEnum,
} from "../enum.js";
import { BaseWallet } from "./Base.js";
import { WalletTypeEnum } from "./enum.js";
import { DUST_UTXO_THRESHOLD } from "../constant.js";
import { TxI, Utxo } from "../interface.js";
import { derivePrefix } from "../util/derivePublicKeyHash.js";
import { SignedMessage } from "../message/signed.js";
import { VerifyMessageResponseI } from "../message/interface.js";
import { TransactionHistoryItem } from "../history/interface.js";
import { getHistory } from "../history/getHistory.js";
import { WalletInfoI } from "./interface.js";
import { toCashaddr, toTokenaddr } from "../util/deriveCashaddr.js";

export interface WatchWalletOptions {
  name?: string;
  publicKey?: Uint8Array;
  publicKeyCompressed?: Uint8Array;
  publicKeyHash?: Uint8Array;
  address?: string;
}

/**
 * Class to manage a mainnet watch wallet.
 */
export class WatchWallet extends BaseWallet {
  readonly publicKeyCompressed?: Uint8Array;
  readonly publicKey?: Uint8Array;
  readonly publicKeyHash!: Uint8Array;
  readonly cashaddr!: string;
  readonly tokenaddr!: string;

  static networkPrefix = CashAddressNetworkPrefix.mainnet;
  static walletType = WalletTypeEnum.Watch;

  constructor(
    name = "",
    network = NetworkType.Mainnet,
    walletType = WalletTypeEnum.Watch
  ) {
    super(network);

    this.name = name;
    // @ts-ignore
    this.walletType = walletType;
  }

  /// Initialize the watch-only wallet given the options - publicKey variations
  /// This internal method is called by the various static constructors
  protected async initialize({
    name = "",
    publicKey = undefined,
    publicKeyCompressed = undefined,
    publicKeyHash = undefined,
    address = undefined,
  }: WatchWalletOptions = {}): Promise<this> {
    if (publicKey?.length) {
      // @ts-ignore
      this.publicKey = publicKey;

      if (!publicKeyCompressed) {
        publicKeyCompressed = assertSuccess(
          secp256k1.compressPublicKey(publicKey)
        );
      }
    }

    if (publicKeyCompressed?.length) {
      // @ts-ignore
      this.publicKeyCompressed = publicKeyCompressed;

      if (!publicKey) {
        publicKey = assertSuccess(
          secp256k1.uncompressPublicKey(publicKeyCompressed)
        );
        // @ts-ignore
        this.publicKey = publicKey;
      }

      publicKeyHash = hash160(publicKeyCompressed);
    }

    if (publicKeyHash?.length) {
      // @ts-ignore
      this.publicKeyHash = publicKeyHash;

      address = encodeCashAddress({
        prefix: prefixFromNetworkMap[this.network],
        type: "p2pkh",
        payload: publicKeyHash,
      }).address;
    }

    if (address?.length) {
      // derive prefix if not provided
      if (!address.includes(":")) {
        const decoded = assertSuccess(
          decodeCashAddressFormatWithoutPrefix(address)
        );
        address = `${decoded.prefix}:${address}`;
      }

      const decoded = assertSuccess(decodeCashAddress(address));

      if (networkPrefixMap[decoded.prefix] !== this.network) {
        throw Error(
          `a ${decoded.prefix} address cannot be watched from a ${this.network} Wallet`
        );
      }

      if (!this.publicKeyHash?.length) {
        if (decoded.type.includes("p2pkh")) {
          // @ts-ignore
          this.publicKeyHash = decoded.payload;
        }
      }

      // @ts-ignore
      this.cashaddr = toCashaddr(address);
      // @ts-ignore
      this.tokenaddr = toTokenaddr(address);
    }

    if (!this.cashaddr?.length || !this.tokenaddr?.length) {
      throw Error("Could not initialize wallet - insufficient parameters");
    }

    this.name = name;

    return this;
  }

  /**
   * getDepositAddress - get a wallet deposit address
   *
   * a high-level function,
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/wallet/depositAddress|/wallet/deposit_address} for REST endpoint
   *
   * @returns The deposit address as a string
   */
  public getDepositAddress(): string {
    return this.cashaddr;
  }

  /**
   * getChangeAddress - get a wallet change address
   *
   * a high-level function,
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/wallet/changeAddress|/wallet/change_address} for REST endpoint
   *
   * @returns The change address as a string
   */
  public getChangeAddress(): string {
    return this.cashaddr;
  }

  /**
   * getTokenDepositAddress - get a cashtoken aware wallet deposit address
   *
   * @returns The cashtoken aware deposit address as a string
   */
  public getTokenDepositAddress(): string {
    return this.tokenaddr;
  }

  // returns the public key hash for an address
  public getPublicKeyHash(hex = false): string | Uint8Array {
    return hex ? binToHex(this.publicKeyHash) : this.publicKeyHash;
  }

  // returns the public key hash for an address
  public getPublicKey(hex = false): string | Uint8Array {
    if (this.publicKey) {
      return hex ? binToHex(this.publicKey) : this.publicKey;
    } else {
      throw Error(
        "The public key for this wallet is not known, perhaps the wallet was created to watch the *hash* of a public key? i.e. a cashaddress."
      );
    }
  }

  // returns the public key hash for an address
  public getPublicKeyCompressed(hex = false): string | Uint8Array {
    if (this.publicKeyCompressed) {
      return hex
        ? binToHex(this.publicKeyCompressed)
        : this.publicKeyCompressed;
    } else {
      throw Error(
        "The compressed public key for this wallet is not known, perhaps the wallet was created to watch the *hash* of a public key? i.e. a cashaddress."
      );
    }
  }

  // Return wallet info
  public getInfo(): WalletInfoI {
    return {
      cashaddr: this.cashaddr,
      tokenaddr: this.tokenaddr,
      isTestnet: this.isTestnet,
      name: this.name,
      network: this.network as any,
      publicKeyHash: binToHex(this.publicKeyHash),
      walletId: this.toString(),
      walletDbEntry: this.toDbString(),
    };
  }

  /**
   * utxos Get unspent outputs for the wallet
   *
   */
  public async getUtxos(): Promise<Utxo[]> {
    return this.getAddressUtxos(this.cashaddr);
  }

  public async getAddressUtxos(address?: string): Promise<Utxo[]> {
    if (!address) {
      address = this.cashaddr;
    }

    if (this._slpSemiAware) {
      const bchUtxos: Utxo[] = await this.provider.getUtxos(address);
      return bchUtxos.filter(
        (bchutxo) => bchutxo.satoshis > DUST_UTXO_THRESHOLD
      );
    } else {
      return this.provider.getUtxos(address);
    }
  }

  // gets transaction history of this wallet
  public async getRawHistory(
    fromHeight: number = 0,
    toHeight: number = -1
  ): Promise<TxI[]> {
    return await this.provider.getHistory(this.cashaddr, fromHeight, toHeight);
  }

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
  } = {}): Promise<TransactionHistoryItem[]> {
    return getHistory({
      addresses: [this.cashaddr],
      provider: this.provider,
      unit,
      fromHeight,
      toHeight,
      start,
      count,
    });
  }

  protected fromId(walletId: string): Promise<this> {
    const [walletType, networkGiven, arg1, arg2]: string[] =
      walletId.split(":");

    if (walletType !== WalletTypeEnum.Watch) {
      throw Error(
        `fromId called on a ${walletType} wallet, expected a ${WalletTypeEnum.Watch} wallet`
      );
    }

    if (this.network != networkGiven) {
      throw Error(`Network prefix ${networkGiven} to a ${this.network} wallet`);
    }

    if (arg2) {
      return this.watchOnly(`${arg1}:${arg2}`);
    }

    return this.watchOnly(arg1);
  }

  // Initialize a watch only wallet from a cash addr
  protected async watchOnly(address: string): Promise<this> {
    // @ts-ignore
    this.walletType = WalletTypeEnum.Watch;

    return this.initialize({ address, name: this.name });
  }

  /**
   * watchOnly - create a watch-only wallet
   *
   * such kind of wallet does not have a private key and is unable to spend any funds
   * however it still allows to use many utility functions such as getting and watching balance, etc.
   *
   * @param address   cashaddress, token aware cashaddress of a wallet
   *
   * @returns instantiated wallet
   */
  public static async watchOnly<T extends typeof WatchWallet>(
    this: T,
    address: string
  ) {
    if (!address?.length)
      throw Error("address is required to create a watch-only wallet");

    return new this().watchOnly(address) as InstanceType<T>;
  }

  /**
   * fromCashaddr - create a watch-only wallet in the network derived from the address
   *
   * such kind of wallet does not have a private key and is unable to spend any funds
   * however it still allows to use many utility functions such as getting and watching balance, etc.
   *
   * @param address   cashaddress of a wallet
   *
   * @returns instantiated wallet
   */
  public static async fromCashaddr<T extends typeof WatchWallet>(
    this: T,
    address: string
  ): Promise<InstanceType<T>> {
    if (!address?.length)
      throw Error("address is required to create a watch-only wallet");

    const prefix = derivePrefix(address);
    const networkType = networkPrefixMap[prefix] as NetworkType;
    return new this("", networkType).watchOnly(address) as InstanceType<T>;
  }

  /**
   * fromTokenaddr - create a watch-only wallet in the network derived from the address
   *
   * such kind of wallet does not have a private key and is unable to spend any funds
   * however it still allows to use many utility functions such as getting and watching balance, etc.
   *
   * @param address   token aware cashaddress of a wallet
   *
   * @returns instantiated wallet
   */
  public static async fromTokenaddr<T extends typeof WatchWallet>(
    this: T,
    address: string
  ): Promise<InstanceType<T>> {
    if (!address?.length)
      throw Error("address is required to create a watch-only wallet");

    const prefix = derivePrefix(address);
    const networkType = networkPrefixMap[prefix] as NetworkType;
    return new this("", networkType).watchOnly(address) as InstanceType<T>;
  }

  /**
   * fromPublicKey - create a watch-only wallet in the network derived from the compressed or uncompressed public key
   *
   * such kind of wallet does not have a private key and is unable to spend any funds
   * however it still allows to use many utility functions such as getting and watching balance, etc.
   *
   * @param publicKey   compressed or uncompressed public key
   *
   * @returns instantiated wallet
   */
  public static async fromPublicKey<T extends typeof WatchWallet>(
    this: T,
    publicKey: Uint8Array
  ): Promise<InstanceType<T>> {
    this.walletType = WalletTypeEnum.Watch;

    return new this(
      "",
      networkPrefixMap[this.networkPrefix] as NetworkType
    ).initialize({
      publicKey: publicKey.length === 33 ? undefined : publicKey,
      publicKeyCompressed: publicKey.length === 33 ? publicKey : undefined,
    }) as InstanceType<T>;
  }

  // Convenience wrapper to verify interface
  public verify(
    message: string,
    sig: string,
    address?: string,
    publicKey?: Uint8Array
  ): VerifyMessageResponseI {
    if (!address) {
      address = this.cashaddr;
    }

    return super.verify(message, sig, address, publicKey);
  }
}

/**
 * Class to manage a testnet watch wallet.
 */
export class TestNetWatchWallet extends WatchWallet {
  static networkPrefix = CashAddressNetworkPrefix.testnet;
  static walletType = WalletTypeEnum.Watch;
  constructor(name = "", network = NetworkType.Testnet) {
    super(name, network);
  }
}

/**
 * Class to manage a regtest watch wallet.
 */
export class RegTestWatchWallet extends WatchWallet {
  static networkPrefix = CashAddressNetworkPrefix.regtest;
  static walletType = WalletTypeEnum.Watch;
  constructor(name = "", network = NetworkType.Regtest) {
    super(name, network);
  }
}
