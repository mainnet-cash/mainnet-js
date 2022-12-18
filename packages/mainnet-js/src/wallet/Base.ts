import { getStorageProvider } from "../db/getStorageProvider.js";
import { MnemonicI, WalletI } from "./interface.js";
import { NetworkType } from "../enum.js";
import { StorageProvider } from "../db/index.js";
import { getRuntimePlatform } from "../util/getRuntimePlatform.js";
import { qrAddress } from "../qr/Qr.js";
import { ImageI } from "../qr/interface.js";
import { WalletTypeEnum } from "./enum.js";

/**
 * A class to hold features used by all wallets
 * @class  BaseWallet
 */
export class BaseWallet implements WalletI {
  provider?: any;
  derivationPath: string = "m/44'/0'/0'/0/0";
  parentDerivationPath: string = "m/44'/0'/0'";
  parentXPubKey?: string;
  mnemonic?: string;
  address?: string;
  privateKey?: any;
  publicKey?: any;
  storage?: StorageProvider;
  isTestnet: boolean;
  name: string;
  network: NetworkType;
  walletType: WalletTypeEnum;

  //#region Accessors
  protected getNetworkProvider(
    // @ts-ignore
    network: NetworkType = NetworkType.Mainnet
  ): any {
    throw Error("getNetworkProvider called on base wallet");
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
    return this.address!;
  }

  /**
   * getDepositQr - get an address qrcode, encoded for display on the web
   *
   * a high-level function
   *
   * @see {@link https://rest-unstable.mainnet.cash/api-docs/#/wallet/depositQr|/wallet/deposit_qr} for REST endpoint
   *
   * @returns The qrcode for the address
   */
  public getDepositQr(): ImageI {
    return qrAddress(this.getDepositAddress() as string);
  }

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
  //#endregion Accessors

  //#region Constructors and Statics
  /**
   * constructor for a new wallet
   * @param {string} name              name of the wallet
   * @param network              network for wallet
   *
   * @throws {Error} if called on BaseWallet
   */
  constructor(
    name: string = "",
    network = NetworkType.Mainnet,
    walletType = WalletTypeEnum.Seed
  ) {
    this.name = name;
    this.network = network;
    this.walletType = walletType;
    this.provider = this.getNetworkProvider(this.network);
    this.isTestnet = this.network === NetworkType.Mainnet ? false : true;
  }

  /**
   * fromId - create a wallet from encoded walletId string
   *
   * @param walletId   walletId options to steer the creation process
   *
   * @returns wallet instantiated accordingly to the walletId rules
   */
  public static async fromId<T extends typeof BaseWallet>(
    this: T,
    walletId: string
  ): Promise<InstanceType<T>> {
    return new this().fromId(walletId) as InstanceType<T>;
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
  public static async fromSeed<T extends typeof BaseWallet>(
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
  public static async newRandom<T extends typeof BaseWallet>(
    this: T,
    name: string = "",
    dbName?: string
  ): Promise<InstanceType<T>> {
    return new this().newRandom(name, dbName) as InstanceType<T>;
  }

  /**
   * watchOnly - create a watch-only wallet
   *
   * such kind of wallet does not have a private key and is unable to spend any funds
   * however it still allows to use many utility functions such as getting and watching balance, etc.
   *
   * @param address   cashaddress, token aware cashaddress or slpaddress of a wallet
   *
   * @returns instantiated wallet
   */
  public static async watchOnly<T extends typeof BaseWallet>(
    this: T,
    address: string
  ) {
    return new this().watchOnly(address) as InstanceType<T>;
  }

  /**
   * named - create a named wallet
   *
   * @param name   user friendly wallet alias
   * @param dbName name under which the wallet will be stored in the database
   * @param force  force recreate wallet in the database if a record already exist
   *
   * @returns instantiated wallet
   */
  public static async named<T extends typeof BaseWallet>(
    this: T,
    name: string,
    dbName?: string,
    force?: boolean
  ): Promise<InstanceType<T>> {
    return new this().named(name, dbName, force) as InstanceType<T>;
  }

  /**
   * replaceNamed - replace (recover) named wallet with a new walletId
   *
   * If wallet with a provided name does not exist yet, it will be created with a `walletId` supplied
   * If wallet exists it will be overwritten without exception
   *
   * @param name   user friendly wallet alias
   * @param walletId walletId options to steer the creation process
   * @param dbName name under which the wallet will be stored in the database
   *
   * @returns instantiated wallet
   */
  public static async replaceNamed<T extends typeof BaseWallet>(
    this: T,
    name: string,
    walletId: string,
    dbName?: string
  ): Promise<InstanceType<T>> {
    return new this().replaceNamed(name, walletId, dbName) as InstanceType<T>;
  }

  /**
   * namedExists - check if a named wallet already exists
   *
   * @param name   user friendly wallet alias
   * @param dbName name under which the wallet will be stored in the database
   *
   * @returns boolean
   */
  public static async namedExists(
    name: string,
    dbName?: string
  ): Promise<boolean> {
    return new this().namedExists(name, dbName);
  }
  //#endregion Constructors

  //#region Protected implementations
  /**
   * generate creates a new wallet
   * @throws {Error} if called on BaseWallet
   */
  protected generate(): Promise<this> {
    throw Error("generate called on base wallet");
  }

  /**
   * fromId - creates a wallet from serialized string
   *
   * @throws {Error} if called on BaseWallet
   */
  protected fromId(walletId: string): Promise<this> {
    let [walletType, networkGiven, arg1, arg2]: string[] = walletId.split(":");

    if (this.network != networkGiven) {
      throw Error(`Network prefix ${networkGiven} to a ${this.network} wallet`);
    }
    switch (walletType) {
      case "watch":
        if (arg2) {
          // watch:testnet:bchtest:qq1234567
          return this.watchOnly(`${arg1}:${arg2}`);
        }
        // watch:testnet:qq1234567
        return this.watchOnly(`${arg1}`);

      case "named":
        if (arg2) {
          // named:testnet:wallet_1:my_database
          return this.named(arg1, arg2);
        } else {
          // named:testnet:wallet_1
          return this.named(arg1);
        }

      case "seed":
        if (arg2) {
          // seed:testnet:table later ... stove kitten pluck:m/44'/0'/0'/0/0
          return this.fromSeed(arg1, arg2);
        }
        // seed:testnet:table later ... stove kitten pluck
        return this.fromSeed(arg1);
      default:
        throw Error(`Unknown wallet type '${walletType}'`);
    }
  }

  // Initialize wallet from a mnemonic phrase
  protected async fromSeed(
    // @ts-ignore
    mnemonic: string,
    // @ts-ignore
    derivationPath?: string
  ): Promise<this> {
    throw Error("fromSeed called on base wallet");
  }

  /**
   * newRandom (internal) if the wallet is named, get or create it; otherwise create a random
   * unnamed wallet
   * @param {string} name              name of the wallet
   * @param {string} dbName            database name the wallet is stored in
   */
  protected async newRandom(name: string, dbName?: string): Promise<this> {
    if (name.length > 0) {
      return this.named(name, dbName);
    } else {
      return this.generate();
    }
  }

  // @ts-ignore
  protected async watchOnly(address: string): Promise<this> {
    throw Error("fromSeed called on base wallet");
  }

  /**
   * named (internal) get a named wallet from the database or create a new one.
   * Note: this function should behave identically if
   *
   * @param {string} name              name of the wallet
   * @param {string} dbName            database name the wallet is stored in
   * @param {boolean} forceNew         attempt to overwrite an existing wallet
   *
   * @throws {Error} if forceNew is true and the wallet already exists
   * @returns a promise to a named wallet
   */
  protected async named(
    name: string,
    dbName?: string,
    forceNew: boolean = false
  ): Promise<this> {
    if (name.length === 0) {
      throw Error("Named wallets must have a non-empty name");
    }
    _checkContextSafety(this);
    this.name = name;
    dbName = dbName ? dbName : (this.network as string);
    let db = getStorageProvider(dbName);

    // If there is a database, force saving or error
    if (db) {
      await db.init();
      let savedWalletRecord = await db.getWallet(name);
      if (savedWalletRecord) {
        await db.close();
        if (forceNew) {
          throw Error(
            `A wallet with the name ${name} already exists in ${dbName}`
          );
        }
        let recoveredWallet = await this.fromId(savedWalletRecord.wallet);
        recoveredWallet.name = savedWalletRecord.name;
        return recoveredWallet;
      } else {
        let wallet = await this.generate();
        await db.addWallet(wallet.name, wallet.toDbString());
        await db.close();
        return wallet;
      }
    } else {
      throw Error(
        "No database was available or configured to store the named wallet."
      );
    }
  }

  /**
   * replaceNamed - Replace (recover) named wallet with a new walletId
   *
   * If wallet with a provided name does not exist yet, it will be created with a `walletId` supplied
   * If wallet exists it will be overwritten without exception
   *
   * @param name   user friendly wallet alias
   * @param walletId walletId options to steer the creation process
   * @param dbName name under which the wallet will be stored in the database
   *
   * @returns instantiated wallet
   */
  protected async replaceNamed(
    name: string,
    walletId: string,
    dbName?: string
  ): Promise<this> {
    if (name.length === 0) {
      throw Error("Named wallets must have a non-empty name");
    }
    _checkContextSafety(this);
    this.name = name;
    dbName = dbName ? dbName : (this.network as string);
    let db = getStorageProvider(dbName);

    if (db) {
      await db.init();
      let savedWalletRecord = await db.getWallet(name);
      await this.fromId(walletId);
      if (savedWalletRecord) {
        await db.updateWallet(name, walletId);
      } else {
        await db.addWallet(name, walletId);
      }

      await db.close();
      return this;
    } else {
      throw Error(
        "No database was available or configured to store the named wallet."
      );
    }
  }

  /**
   * namedExists - check if a named wallet already exists
   *
   * @param name   user friendly wallet alias
   * @param dbName name under which the wallet will be stored in the database
   *
   * @returns boolean
   */
  protected async namedExists(name: string, dbName?: string): Promise<boolean> {
    if (name.length === 0) {
      throw Error("Named wallets must have a non-empty name");
    }
    _checkContextSafety(this);
    dbName = dbName ? dbName : (this.network as string);
    let db = getStorageProvider(dbName);

    if (db) {
      await db.init();
      let savedWalletRecord = await db.getWallet(name);
      await db.close();
      return savedWalletRecord !== undefined;
    } else {
      throw Error(
        "No database was available or configured to store the named wallet."
      );
    }
  }
  //#endregion Protected implementations

  //#region Serialization
  /**
   * toDbString - store the serialized version of the wallet in the database, not just the name
   *
   * @throws {Error} if called on BaseWallet
   */
  public toDbString(): string {
    if (this.walletType == WalletTypeEnum.Seed) {
      return `${this.walletType}:${this.network}:${this.mnemonic}:${this.derivationPath}`;
    } else if (this.walletType == WalletTypeEnum.Watch) {
      return `${this.walletType}:${this.network}:${this.getDepositAddress()}`;
    }

    return "";
  }

  // Returns the serialized wallet as a string
  // If storing in a database, set asNamed to false to store secrets
  // In all other cases, the a named wallet is deserialized from the database
  //  by the name key
  public toString() {
    if (this.name) {
      return `named:${this.network}:${this.name}`;
    } else if (this.walletType == WalletTypeEnum.Seed) {
      return `${this.walletType}:${this.network}:${this.mnemonic}:${this.derivationPath}`;
    } else if (this.walletType == WalletTypeEnum.Watch) {
      return `${this.walletType}:${this.network}:${this.getDepositAddress()}`;
    }

    return "";
  }
  //#endregion Serialization

  //#region Funds
  // @ts-ignore
  public async getBalance(rawUnit?: any): Promise<any> {
    throw Error("sendMax called on base wallet");
  }

  // @ts-ignore
  public async getMaxAmountToSend(params?: any): Promise<any> {
    throw Error("getMaxAmountToSend called on base wallet");
  }

  // @ts-ignore
  public async send(requests: any, options?: any): Promise<any> {
    throw Error("send called on base wallet");
  }

  // @ts-ignore
  public async sendMax(address: string, options?: any): Promise<any> {
    throw Error("sendMax called on base wallet");
  }
  //#endregion Funds
}

/**
 * _checkContextSafety (internal) if running in nodejs, will disable saving
 * mainnet wallets on public servers if ALLOW_MAINNET_USER_WALLETS is set to false
 * @param {BaseWallet} wallet        a wallet
 */
const _checkContextSafety = function (wallet: BaseWallet) {
  if (getRuntimePlatform() === "node") {
    if (process.env.ALLOW_MAINNET_USER_WALLETS === `false`) {
      if (wallet.network === NetworkType.Mainnet) {
        throw Error(
          `Refusing to save wallet in an open public database, remove ALLOW_MAINNET_USER_WALLETS="false", if this service is secure and private`
        );
      }
    }
  }
};

/**
 * getNamedWalletId - get the full wallet id from the database
 *
 * @param name   user friendly wallet alias
 * @param dbName name under which the wallet will be stored in the database
 *
 * @returns boolean
 */
export async function getNamedWalletId(
  name: string,
  dbName?: string
): Promise<string | undefined> {
  if (name.length === 0) {
    throw Error("Named wallets must have a non-empty name");
  }

  dbName = dbName ? dbName : (dbName as string);
  let db = getStorageProvider(dbName);

  if (db) {
    await db.init();
    let savedWalletRecord = await db.getWallet(name);
    await db.close();
    if (savedWalletRecord !== undefined) {
      return savedWalletRecord.wallet;
    } else {
      throw Error(`No record was found for ${name} in db: ${dbName}`);
    }
  } else {
    throw Error(
      "No database was available or configured to store the named wallet."
    );
  }
}
