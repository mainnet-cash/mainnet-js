//#region Imports
import {
  deriveSeedFromBip39Mnemonic,
  encodeHdPublicKey,
  generateBip39Mnemonic,
  HdKeyNetwork,
  hexToBin,
  secp256k1,
} from "@bitauth/libauth";

import {
  binToHex,
  CashAddressNetworkPrefix,
  decodePrivateKeyWif,
  deriveHdPath,
  deriveHdPrivateNodeFromSeed,
  deriveHdPublicNode,
  encodePrivateKeyWif,
  generatePrivateKey,
} from "@bitauth/libauth";

import { NetworkType } from "../enum.js";

import { PrivateKeyI } from "../interface.js";

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
import { SignedMessage, SignedMessageI } from "../message/index.js";
import ElectrumNetworkProvider from "../network/ElectrumNetworkProvider.js";
import { checkForEmptySeed } from "../util/checkForEmptySeed.js";
import { checkWifNetwork } from "../util/checkWifNetwork.js";
import { deriveCashaddr, deriveTokenaddr } from "../util/deriveCashaddr.js";
import { derivePublicKeyHash } from "../util/derivePublicKeyHash.js";
import { getXPubKey } from "../util/getXPubKey.js";
import { generateRandomBytes } from "../util/randomBytes.js";

import { Config } from "../config.js";
import {
  BalanceResponse,
  balanceResponseFromSatoshi,
} from "../util/balanceObjectFromSatoshi.js";
import { BaseWallet } from "./Base.js";
//#endregion Imports

/**
 * Class to manage a bitcoin cash wallet.
 */
export class Wallet extends BaseWallet {
  declare readonly provider: ElectrumNetworkProvider;
  declare readonly cashaddr: string;
  declare readonly tokenaddr: string;
  readonly derivationPath: string = Config.DefaultParentDerivationPath + "/0/0";
  readonly parentDerivationPath: string = Config.DefaultParentDerivationPath;
  readonly mnemonic!: string;
  readonly parentXPubKey!: string;
  readonly privateKey!: Uint8Array;
  readonly publicKeyCompressed!: Uint8Array;
  readonly privateKeyWif!: string;
  readonly publicKey!: Uint8Array;
  declare readonly publicKeyHash: Uint8Array;
  declare name: string;
  static readonly signedMessage: SignedMessageI = new SignedMessage();

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
  //#endregion

  //#region Constructors and Statics
  constructor(
    name = "",
    network = NetworkType.Mainnet,
    walletType = WalletTypeEnum.Seed
  ) {
    super(network);
    this.name = name;
    // @ts-ignore
    this.walletType = walletType;
  }

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
   * unless specified the derivation path m/44'/245'/0'/0/0 will be userd
   * this derivation path is standard for Electron Cash SLP and other SLP enabled wallets
   *
   * @param seed   BIP39 12 word seed phrase
   * @param derivationPath BIP44 HD wallet derivation path to get a single the private key from hierarchy
   *
   * @returns instantiated wallet
   */
  public static async fromSeed<T extends typeof Wallet>(
    this: T,
    seed: string,
    derivationPath?: string
  ): Promise<InstanceType<T>> {
    return new this().fromSeed(seed, derivationPath) as InstanceType<T>;
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
  protected async generate(): Promise<this> {
    if (this.walletType === WalletTypeEnum.Wif) {
      return await this._generateWif();
    } else if (this.walletType === WalletTypeEnum.Watch) {
      return this;
    } else if (this.walletType === WalletTypeEnum.Hd) {
      throw Error("Not implemented");
    } else if (this.walletType === WalletTypeEnum.Seed) {
      return await this._generateMnemonic();
    } else {
      console.log(this.walletType);
      throw Error(`Could not determine walletType: ${this.walletType}`);
    }
  }

  private async _generateWif() {
    if (!this.privateKey) {
      // @ts-ignore
      this.privateKey = generatePrivateKey(
        () => generateRandomBytes(32) as Uint8Array
      );
    }
    return this.deriveInfo();
  }

  private async _generateMnemonic() {
    // @ts-ignore
    this.mnemonic = generateBip39Mnemonic();
    if (this.mnemonic.length == 0)
      throw Error("refusing to create wallet from empty mnemonic");
    const seed = deriveSeedFromBip39Mnemonic(this.mnemonic);
    checkForEmptySeed(seed);
    const network = this.isTestnet ? "testnet" : "mainnet";
    // @ts-ignore
    this.parentXPubKey = getXPubKey(seed, this.parentDerivationPath, network);

    const hdNode = deriveHdPrivateNodeFromSeed(seed, {
      assumeValidity: true, // TODO: we should switch to libauth's BIP39 implementation and set this to false
      throwErrors: true,
    });

    const zerothChild = deriveHdPath(hdNode, this.derivationPath);
    if (typeof zerothChild === "string") {
      throw Error(zerothChild);
    }
    // @ts-ignore
    this.privateKey = zerothChild.privateKey;

    // @ts-ignore
    this.walletType = WalletTypeEnum.Seed;
    return await this.deriveInfo();
  }

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

  public async getXPubKeys(paths?) {
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
  // Initialize wallet from a mnemonic phrase
  protected async fromSeed(
    mnemonic: string,
    derivationPath?: string
  ): Promise<this> {
    // @ts-ignore
    this.mnemonic = mnemonic.trim().toLowerCase();

    if (this.mnemonic.length == 0)
      throw Error("refusing to create wallet from empty mnemonic");
    const seed = deriveSeedFromBip39Mnemonic(this.mnemonic);
    checkForEmptySeed(seed);
    if (this.mnemonic.split(" ").length !== 12) {
      throw Error("Invalid mnemonic");
    }
    const hdNode = deriveHdPrivateNodeFromSeed(seed, {
      assumeValidity: true, // TODO: we should switch to libauth's BIP39 implementation and set this to false
      throwErrors: true,
    });
    if (derivationPath) {
      // @ts-ignore
      this.derivationPath = derivationPath;

      // If the derivation path is for the first account child, set the parent derivation path
      const path = derivationPath.split("/");
      if (path.slice(-2).join("/") == "0/0") {
        // @ts-ignore
        this.parentDerivationPath = path.slice(0, -2).join("/");
      }
    }

    const zerothChild = deriveHdPath(hdNode, this.derivationPath);
    if (typeof zerothChild === "string") {
      throw Error(zerothChild);
    }
    // @ts-ignore
    this.privateKey = zerothChild.privateKey;

    const network = this.isTestnet ? "testnet" : "mainnet";
    // @ts-ignore
    this.parentXPubKey = await getXPubKey(
      seed,
      this.parentDerivationPath,
      network
    );

    // @ts-ignore
    this.walletType = WalletTypeEnum.Seed;
    await this.deriveInfo();
    return this;
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

  // Initialize wallet from private key in hex or Uint8Array
  protected async fromPrivateKey(
    privateKey: string | Uint8Array
  ): Promise<this> {
    if (typeof privateKey === "string") {
      privateKey = hexToBin(privateKey);
    }

    // @ts-ignore
    this.privateKey = privateKey;
    // @ts-ignore
    this.walletType = WalletTypeEnum.PrivateKey;
    await this.deriveInfo();
    return this;
  }

  // Initialize wallet from Wallet Import Format
  protected async fromWIF(secret: string): Promise<this> {
    checkWifNetwork(secret, this.network);

    let wifResult = decodePrivateKeyWif(secret);

    if (typeof wifResult === "string") {
      throw Error(wifResult as string);
    }
    let resultData: PrivateKeyI = wifResult as PrivateKeyI;
    // @ts-ignore
    this.privateKey = resultData.privateKey;
    // @ts-ignore
    this.privateKeyWif = secret;
    // @ts-ignore
    this.walletType = WalletTypeEnum.Wif;
    await this.deriveInfo();
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
      return this.generate();
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
  public async getMaxAmountToSend(
    params: {
      outputCount?: number;
      options?: SendRequestOptionsI;
    } = {
      outputCount: 1,
      options: {},
    }
  ): Promise<BalanceResponse> {
    const { value: result } = await this._getMaxAmountToSend({
      options: params.options,
      outputCount: params.outputCount,
      privateKey: this.privateKey,
    });

    return await balanceResponseFromSatoshi(result);
  }

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
    return super.encodeTransaction(
      requests,
      discardChange,
      options,
      this.privateKey
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

  //#region Private implementation details
  private async deriveInfo() {
    const publicKey = secp256k1.derivePublicKeyUncompressed(this.privateKey);
    if (typeof publicKey === "string") {
      throw new Error(publicKey);
    }
    // @ts-ignore
    this.publicKey = publicKey;
    const publicKeyCompressed = secp256k1.derivePublicKeyCompressed(
      this.privateKey
    );
    if (typeof publicKeyCompressed === "string") {
      throw new Error(publicKeyCompressed);
    }
    // @ts-ignore
    this.publicKeyCompressed = publicKeyCompressed;
    const networkType =
      this.network === NetworkType.Regtest ? NetworkType.Testnet : this.network;
    // @ts-ignore
    this.privateKeyWif = encodePrivateKeyWif(this.privateKey, networkType);
    checkWifNetwork(this.privateKeyWif, this.network);

    // @ts-ignore
    this.cashaddr = deriveCashaddr(this.privateKey, this.networkPrefix);
    // @ts-ignore
    this.tokenaddr = deriveTokenaddr(this.privateKey, this.networkPrefix);
    // @ts-ignore
    this.publicKeyHash = derivePublicKeyHash(this.cashaddr);
    return this;
  }
  //#endregion Private implementation details

  //#region Signing
  // Convenience wrapper to sign interface
  public async sign(message: string) {
    return await Wallet.signedMessage.sign(message, this.privateKey);
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
