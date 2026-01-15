//#region Imports
import {
  assertSuccess,
  binToHex,
  CashAddressNetworkPrefix,
  decodePrivateKeyWif,
  deriveHdPath,
  deriveHdPrivateNodeFromSeed,
  deriveHdPublicNode,
  deriveSeedFromBip39Mnemonic,
  encodeHdPublicKey,
  encodePrivateKeyWif,
  generateBip39Mnemonic,
  generatePrivateKey,
  HdKeyNetwork,
  hexToBin,
  secp256k1,
} from "@bitauth/libauth";

import { NetworkType } from "../enum.js";

import { WalletTypeEnum } from "./enum.js";
import { MnemonicI, SendRequestOptionsI, WalletInfoI } from "./interface.js";

import {
  OpReturnData,
  SendRequest,
  SendRequestArray,
  SendResponse,
  SourceOutput,
  TokenSendRequest,
  XPubKey,
} from "./model.js";

import { signUnsignedTransaction } from "../transaction/Wif.js";

import { DERIVATION_PATHS } from "../constant.js";
import {
  SignedMessage,
  SignedMessageI,
  SignedMessageResponseI,
} from "../message/index.js";
import ElectrumNetworkProvider from "../network/ElectrumNetworkProvider.js";
import { checkForEmptySeed } from "../util/checkForEmptySeed.js";
import { checkWifNetwork } from "../util/checkWifNetwork.js";
import { generateRandomBytes } from "../util/randomBytes.js";

import { Config } from "../config.js";
import { WatchWallet } from "./Watch.js";
//#endregion Imports

export interface WalletOptions {
  name?: string;
  mnemonic?: string;
  derivationPath?: string;
  privateKey?: Uint8Array;
  privateKeyWif?: string;
  publicKey?: Uint8Array;
  publicKeyCompressed?: Uint8Array;
  publicKeyHash?: Uint8Array;
  address?: string;
}

/**
 * Class to manage a bitcoin cash wallet.
 */
export class Wallet extends WatchWallet {
  declare readonly provider: ElectrumNetworkProvider;

  readonly derivationPath: string = Config.DefaultParentDerivationPath + "/0/0";
  readonly parentDerivationPath: string = Config.DefaultParentDerivationPath;
  readonly mnemonic!: string;
  readonly parentXPubKey!: string;
  readonly privateKey!: Uint8Array;
  readonly privateKeyWif!: string;

  declare name: string;

  //#region Constructors and Statics
  constructor(
    name = "",
    network = NetworkType.Mainnet,
    walletType = WalletTypeEnum.Seed
  ) {
    super(name, network);

    this.name = name;
    // @ts-ignore
    this.walletType = walletType;
  }

  /// Initialize the wallet given the options mnemonic, privateKey or publicKey variations
  /// If none provided, a new random mnemonic will be generated
  /// If mnemonic or private key provided, the wallet will be able to sign transactions
  /// Otherwise, the wallet will be watch-only
  /// This internal method is called by the various static constructors
  protected async initialize({
    name = "",
    mnemonic = undefined,
    derivationPath = undefined,
    privateKey = undefined,
    privateKeyWif = undefined,
    publicKey = undefined,
    publicKeyCompressed = undefined,
    publicKeyHash = undefined,
    address = undefined,
  }: WalletOptions = {}) {
    // seed wallet
    if (this.walletType === WalletTypeEnum.Seed && !mnemonic) {
      mnemonic = generateBip39Mnemonic();
    }

    if (mnemonic?.length) {
      mnemonic = mnemonic.trim().toLowerCase();
      if (mnemonic.split(" ").length !== 12) {
        throw Error("Invalid mnemonic");
      }

      if (derivationPath) {
        // @ts-ignore
        this.derivationPath = derivationPath;

        // If the derivation path is for the first account child, set the parent derivation path
        const path = derivationPath.split("/");
        if (path.slice(-2).join("/") == "0/0") {
          // @ts-ignore
          this.parentDerivationPath = path.slice(0, -2).join("/");
        }
      } else {
        derivationPath = Config.DefaultParentDerivationPath + "/0/0";
        // @ts-ignore
        this.parentDerivationPath = Config.DefaultParentDerivationPath;
      }

      // @ts-ignore
      this.mnemonic = mnemonic;
      // @ts-ignore
      this.derivationPath = derivationPath;

      const seed = deriveSeedFromBip39Mnemonic(this.mnemonic);
      checkForEmptySeed(seed);

      const rootNode = deriveHdPrivateNodeFromSeed(seed, {
        assumeValidity: true,
        throwErrors: true,
      });
      const parentNode = deriveHdPath(rootNode, this.parentDerivationPath);

      // @ts-ignore
      this.parentXPubKey = assertSuccess(
        encodeHdPublicKey({
          node: deriveHdPublicNode(parentNode),
          network: this.network === NetworkType.Mainnet ? "mainnet" : "testnet",
        })
      ).hdPublicKey;

      const childNode = deriveHdPath(rootNode, this.derivationPath);
      privateKey = childNode.privateKey;
    }

    // privkey wallet
    if (this.walletType === WalletTypeEnum.PrivateKey && !privateKey) {
      // @ts-ignore
      this.privateKey = generatePrivateKey(
        () => generateRandomBytes(32) as Uint8Array
      );
    }

    if (privateKey?.length) {
      // @ts-ignore
      this.privateKey = privateKey;

      privateKeyWif = encodePrivateKeyWif(
        privateKey,
        this.network === NetworkType.Regtest
          ? NetworkType.Testnet
          : this.network
      );
    }

    // wif wallet
    if (this.walletType === WalletTypeEnum.Wif && !privateKeyWif) {
      // @ts-ignore
      this.privateKey = generatePrivateKey(
        () => generateRandomBytes(32) as Uint8Array
      );

      privateKeyWif = encodePrivateKeyWif(
        this.privateKey,
        this.network === NetworkType.Regtest
          ? NetworkType.Testnet
          : this.network
      );
    }

    if (privateKeyWif?.length) {
      checkWifNetwork(privateKeyWif, this.network);

      // @ts-ignore
      this.privateKeyWif = privateKeyWif;

      if (!this.privateKey) {
        // @ts-ignore
        this.privateKey = assertSuccess(
          decodePrivateKeyWif(privateKeyWif)
        ).privateKey;
      }

      publicKey = assertSuccess(
        secp256k1.derivePublicKeyUncompressed(this.privateKey)
      );
      publicKeyCompressed = assertSuccess(
        secp256k1.compressPublicKey(publicKey!)
      );
    }

    // rest cases are for watch wallets
    return super.initialize({
      name,
      publicKey,
      publicKeyCompressed,
      publicKeyHash,
      address,
    });
  }
  //#endregion Constructors and Statics

  //#region Accessors
  // Get mnemonic and derivation path for wallet
  public getSeed(): MnemonicI {
    if (!this.mnemonic) {
      throw Error("Wallet mnemonic seed phrase not set");
    }
    if (!this.derivationPath) {
      throw Error("Wallet derivation path not set");
    }
    return {
      seed: this.mnemonic,
      derivationPath: this.derivationPath,
      parentDerivationPath: this.parentDerivationPath,
    };
  }

  // Return wallet info
  public getInfo(): WalletInfoI {
    return {
      cashaddr: this.cashaddr,
      tokenaddr: this.tokenaddr,
      isTestnet: this.isTestnet,
      name: this.name,
      network: this.network as any,
      seed: this.mnemonic ? this.getSeed().seed : undefined,
      derivationPath: this.mnemonic ? this.getSeed().derivationPath : undefined,
      parentDerivationPath: this.mnemonic
        ? this.getSeed().parentDerivationPath
        : undefined,
      parentXPubKey: this.parentXPubKey ? this.parentXPubKey : undefined,
      publicKey: this.publicKey ? binToHex(this.publicKey) : undefined,
      publicKeyHash: binToHex(this.publicKeyHash),
      privateKey: this.privateKey ? binToHex(this.privateKey) : undefined,
      privateKeyWif: this.privateKeyWif,
      walletId: this.toString(),
      walletDbEntry: this.toDbString(),
    };
  }

  // Get common xpub paths from zerothChild privateKey
  public async deriveHdPaths(hdPaths: string[]): Promise<any[]> {
    if (!this.mnemonic)
      throw Error("refusing to create wallet from empty mnemonic");
    const seed = deriveSeedFromBip39Mnemonic(this.mnemonic);
    checkForEmptySeed(seed);
    const hdNode = deriveHdPrivateNodeFromSeed(seed, {
      assumeValidity: true, // TODO: we should switch to libauth's BIP39 implementation and set this to false
      throwErrors: true,
    });

    const result: any[] = [];

    for (const path of hdPaths) {
      if (path === "m") {
        throw Error(
          "Storing or sharing of parent public key may lead to loss of funds. Storing or sharing *root* parent public keys is strongly discouraged, although all parent keys have risk. See: https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki#implications"
        );
      }
      const childNode = deriveHdPath(hdNode, path);
      if (typeof childNode === "string") {
        throw Error(childNode);
      }
      const node = deriveHdPublicNode(childNode);
      if (typeof node === "string") {
        throw Error(node);
      }
      const xPubKey = encodeHdPublicKey(
        {
          network: this.network as HdKeyNetwork,
          node: node,
        },
        {
          throwErrors: true,
        }
      ).hdPublicKey;
      const key = new XPubKey({
        path: path,
        xPubKey: xPubKey,
      });

      result.push(await key.ready());
    }
    return await Promise.all(result).then((result) => {
      return result;
    });
  }

  public async getXPubKeys(paths?: string[]) {
    if (this.mnemonic) {
      if (paths) {
        let xPubKeys = await this.deriveHdPaths(paths);
        return [xPubKeys];
      } else {
        return await this.deriveHdPaths(DERIVATION_PATHS);
      }
    } else {
      throw Error("xpubkeys can only be derived from seed type wallets.");
    }
  }
  //#endregion

  //#region Statics
  /**
   * fromId - create a wallet from encoded walletId string
   *
   * @param walletId   walletId options to steer the creation process
   *
   * @returns wallet instantiated accordingly to the walletId rules
   */
  public static async fromId<T extends typeof Wallet>(
    this: T,
    walletId: string
  ): Promise<InstanceType<T>> {
    return new this().fromId(walletId) as InstanceType<T>;
  }

  /**
   * fromPrivateKey - create a wallet using the private key supplied in hex or Uint8Array
   *
   * @param wif   WIF encoded private key string
   *
   * @returns instantiated wallet
   */
  public static async fromPrivateKey<T extends typeof Wallet>(
    this: T,
    privateKey: string | Uint8Array
  ): Promise<InstanceType<T>> {
    return new this().fromPrivateKey(privateKey) as InstanceType<T>;
  }

  /**
   * fromWIF - create a wallet using the private key supplied in `Wallet Import Format`
   *
   * @param wif   WIF encoded private key string
   *
   * @returns instantiated wallet
   */
  public static async fromWIF<T extends typeof Wallet>(
    this: T,
    wif: string
  ): Promise<InstanceType<T>> {
    return new this().fromWIF(wif) as InstanceType<T>;
  }

  /**
   * fromSeed - create a wallet using the seed phrase and derivation path
   *
   * unless specified the derivation path m/44'/0'/0'/0/0 will be used
   *
   * @param mnemonic   BIP39 12 word seed phrase
   * @param derivationPath BIP44 HD wallet derivation path to get a single the private key from hierarchy
   *
   * @returns instantiated wallet
   */
  public static async fromSeed<T extends typeof Wallet>(
    this: T,
    mnemonic: string,
    derivationPath?: string
  ): Promise<InstanceType<T>> {
    return new this().fromSeed(mnemonic, derivationPath) as InstanceType<T>;
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
  public static async newRandom<T extends typeof Wallet>(
    this: T,
    name: string = "",
    dbName?: string
  ): Promise<InstanceType<T>> {
    return new this().newRandom(name, dbName) as InstanceType<T>;
  }
  //#endregion Constructors

  //#region Protected implementations
  protected fromId = async (walletId: string): Promise<this> => {
    const [walletType, networkGiven, arg1, arg2]: string[] =
      walletId.split(":");

    if (this.network !== networkGiven) {
      throw Error(`Network prefix ${networkGiven} to a ${this.network} wallet`);
    }

    // "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    switch (walletType) {
      case WalletTypeEnum.PrivateKey:
        return this.fromPrivateKey(arg1);

      case WalletTypeEnum.Wif:
        return this.fromWIF(arg1);

      case WalletTypeEnum.Watch:
        if (arg2) {
          // watch:testnet:bchtest:qq1234567
          return this.watchOnly(`${arg1}:${arg2}`);
        }
        // watch:testnet:qq1234567
        return this.watchOnly(`${arg1}`);

      case WalletTypeEnum.Named:
        if (arg2) {
          // named:testnet:wallet_1:my_database
          return this.named(arg1, arg2);
        } else {
          // named:testnet:wallet_1
          return this.named(arg1);
        }

      case WalletTypeEnum.Seed:
        if (arg2) {
          // seed:testnet:table later ... stove kitten pluck:m/44'/0'/0'/0/0
          return this.fromSeed(arg1, arg2);
        }
        // seed:testnet:table later ... stove kitten pluck
        return this.fromSeed(arg1);

      default:
        throw Error(`Unknown wallet type '${walletType}'`);
    }
  };

  // Initialize wallet from a mnemonic phrase
  protected async fromSeed(
    mnemonic: string,
    derivationPath?: string
  ): Promise<this> {
    if (!mnemonic.length) {
      throw Error("refusing to create wallet from empty mnemonic");
    }

    // @ts-ignore
    this.walletType = WalletTypeEnum.Seed;

    await this.initialize({ mnemonic, derivationPath });

    return this;
  }

  // Initialize wallet from private key in hex or Uint8Array
  protected async fromPrivateKey(
    privateKey: string | Uint8Array
  ): Promise<this> {
    if (typeof privateKey === "string") {
      privateKey = hexToBin(privateKey);
    }

    // @ts-ignore
    this.walletType = WalletTypeEnum.PrivateKey;

    await this.initialize({ privateKey });

    return this;
  }

  // Initialize wallet from Wallet Import Format
  protected async fromWIF(privateKeyWif: string): Promise<this> {
    // @ts-ignore
    this.walletType = WalletTypeEnum.Wif;

    await this.initialize({ privateKeyWif });

    return this;
  }

  /**
   * newRandom (internal) if the wallet is named, get or create it; otherwise create a random
   * unnamed wallet
   * @param {string} name              name of the wallet
   * @param {string} dbName            database name the wallet is stored in
   */
  protected async newRandom(name: string, dbName?: string): Promise<this> {
    dbName = dbName ? dbName : this.networkPrefix;
    if (name.length > 0) {
      return this.named(name, dbName);
    } else {
      return this.initialize();
    }
  }
  //#endregion Protected Implementations

  //#region Serialization
  // Returns the serialized wallet as a string
  // If storing in a database, set asNamed to false to store secrets
  // In all other cases, the a named wallet is deserialized from the database
  // by the name key
  public toString() {
    if (this.name) {
      return `named:${this.network}:${this.name}`;
    } else if (this.walletType == WalletTypeEnum.PrivateKey) {
      return `${this.walletType}:${this.network}:${binToHex(this.privateKey)}`;
    } else if (this.walletType == WalletTypeEnum.Seed) {
      return `${this.walletType}:${this.network}:${this.mnemonic}:${this.derivationPath}`;
    } else if (this.walletType === WalletTypeEnum.Wif) {
      return `${this.walletType}:${this.network}:${this.privateKeyWif}`;
    } else if (this.walletType == WalletTypeEnum.Watch) {
      return super.toString();
    }

    throw Error("toString unsupported wallet type");
  }

  /**
   * toDbString - store the serialized version of the wallet in the database, not just the name
   *
   * @throws {Error} if called on BaseWallet
   */
  public toDbString() {
    if (this.walletType == WalletTypeEnum.Seed) {
      return `${this.walletType}:${this.network}:${this.mnemonic}:${this.derivationPath}`;
    } else if (this.walletType == WalletTypeEnum.PrivateKey) {
      return `${this.walletType}:${this.network}:${binToHex(this.privateKey)}`;
    } else if (this.walletType === WalletTypeEnum.Wif) {
      return `${this.walletType}:${this.network}:${this.privateKeyWif}`;
    } else if (this.walletType == WalletTypeEnum.Watch) {
      return super.toDbString();
    }

    throw Error("toDbString unsupported wallet type");
  }
  //#endregion Serialization

  //#region Funds
  /**
   * sendMax Send all available funds to a destination cash address
   *
   * @param  {string} cashaddr destination cash address
   * @param  {SendRequestOptionsI} options Options of the send requests
   *
   * @returns (depending on the options parameter) the transaction id, new address balance and a link to the transaction on the blockchain explorer
   */
  public async sendMax(
    cashaddr: string,
    options?: SendRequestOptionsI
  ): Promise<SendResponse> {
    return this.sendMaxRaw(cashaddr, options, this.privateKey);
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
    privateKey = privateKey ?? this.privateKey;

    if (!privateKey && options?.buildUnsigned !== true) {
      throw new Error(`Missing private key`);
    }

    return super.encodeTransaction(
      requests,
      discardChange,
      options,
      privateKey
    );
  }

  public async signUnsignedTransaction(
    transaction: Uint8Array | string,
    sourceOutputs: SourceOutput[]
  ): Promise<Uint8Array> {
    if (!this.privateKey) {
      throw Error("Can not sign a transaction with watch-only wallet.");
    }

    return signUnsignedTransaction(transaction, sourceOutputs, this.privateKey);
  }
  //#endregion Funds

  //#region Signing
  // Convenience wrapper to sign interface
  public sign(
    message: string,
    privateKey: Uint8Array | undefined = undefined
  ): SignedMessageResponseI {
    return super.sign(message, privateKey ?? this.privateKey);
  }
}

/**
 * Class to manage a testnet wallet.
 */
export class TestNetWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.testnet;
  static faucetServer = "https://rest-unstable.mainnet.cash";
  constructor(name = "") {
    super(name, NetworkType.Testnet);
  }
}

/**
 * Class to manage a regtest wallet.
 */
export class RegTestWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.regtest;
  constructor(name = "") {
    super(name, NetworkType.Regtest);
  }
}

/**
 * Class to manage a bitcoin cash wif wallet.
 */
export class WifWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.mainnet;
  static walletType = WalletTypeEnum.Wif;
  constructor(name = "") {
    super(name, NetworkType.Mainnet, WalletTypeEnum.Wif);
  }
}

/**
 * Class to manage a testnet wif wallet.
 */
export class TestNetWifWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.testnet;
  static walletType = WalletTypeEnum.Wif;
  constructor(name = "") {
    super(name, NetworkType.Testnet, WalletTypeEnum.Wif);
  }
}

/**
 * Class to manage a regtest wif wallet.
 */
export class RegTestWifWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.regtest;
  static walletType = WalletTypeEnum.Wif;
  constructor(name = "") {
    super(name, NetworkType.Regtest, WalletTypeEnum.Wif);
  }
}
