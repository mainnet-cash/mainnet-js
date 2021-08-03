import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { CashAddressNetworkPrefix } from "@bitauth/libauth";
import { NetworkEnum, networkPrefixMap, NetworkType } from "../enum";
import { Network } from "../interface";
import { ethers, utils } from "ethers";
import { WalletTypeEnum } from "../wallet/enum";
import { derivePrefix } from "../util/derivePublicKeyHash";
import { SendRequest, SendRequestArray, SendResponse } from "../wallet/model";
import { SendRequestOptionsI } from "../wallet/interface";
import { balanceFromSatoshi, BalanceResponse, balanceResponseFromSatoshi } from "../util/balanceObjectFromSatoshi";
import { sanitizeUnit } from "../util/sanitizeUnit";
import { BaseWallet } from "../wallet/Base";
import { amountInSatoshi } from "../util/amountInSatoshi";
import { Erc20 } from "./Erc20";

function getNetworkProvider(
  network: Network = Network.MAINNET,
  _servers?: string[] | string,
  // manualConnectionManagement?: boolean,
  // options?: ElectrumClusterParams
): any {
  switch (network) {
    case Network.MAINNET: {
      return new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161");
    }
    case Network.TESTNET: {
      return new ethers.providers.JsonRpcProvider("http://35.220.203.194:8545", { name: "smartbch", chainId: 10001 });
    }
    default: {
      return new ethers.providers.JsonRpcProvider("http://localhost:8545");
    }
  }
}

export class SmartBchWallet extends BaseWallet {
  provider?: ethers.providers.BaseProvider | any;
  ethersWallet?: ethers.Wallet;
  privateKey?: string;
  privateKeyWif?: string;
  walletType?: WalletTypeEnum;
  publicKey?: string;
  cashaddr?: string;
  address?: string;
  mnemonic?: string;
  derivationPath?: string = "m/44'/60'/0'/0/0";
  _erc20?: Erc20;

  /**
   * constructor for a new wallet
   * @param {string} name              name of the wallet
   * @param networkPrefix              network for wallet
   *
   * @throws {Error} if called on BaseWallet
   */
   constructor(name = "", networkPrefix = CashAddressNetworkPrefix.mainnet, walletType = WalletTypeEnum.Seed
   ) {
    super(name, networkPrefix);
    this.name = name;
    this.networkPrefix = networkPrefix;
    this.walletType = walletType;

    switch (this.networkPrefix) {
      case CashAddressNetworkPrefix.regtest:
        this.network = NetworkEnum.Regtest;
        this.networkType = NetworkType.Regtest;
        this.provider = getNetworkProvider("regtest");
        break;
      case CashAddressNetworkPrefix.testnet:
        this.network = NetworkEnum.Testnet;
        this.networkType = NetworkType.Testnet;
        this.provider = getNetworkProvider("testnet");
        break;
      default:
        this.network = NetworkEnum.Mainnet;
        this.networkType = NetworkType.Mainnet;
        this.provider = getNetworkProvider();
    }

    this.isTestnet = this.networkType === "mainnet" ? false : true;
  }

  // interface to slp functions. see Erc20.ts
  public get erc20() {
    if (!this._erc20) {
      this._erc20 = new Erc20(this);
    }

    return this._erc20;
  }

  // interface to slp functions. see Erc20.ts
  public static get erc20() {
    return Erc20;
  }

  public async fromWIF(secret: string): Promise<this> {
    this.ethersWallet = new ethers.Wallet(secret).connect(this.provider!);
    this.privateKey = this.ethersWallet.privateKey;
    this.privateKeyWif = secret;
    this.walletType = WalletTypeEnum.Wif;
    await this.deriveInfo();
    return this;
  }

  // Initialize wallet from a mnemonic phrase
  public async fromSeed(
    mnemonic: string,
    derivationPath?: string
  ): Promise<this> {
    this.mnemonic = mnemonic;

    if (derivationPath) {
      this.derivationPath = derivationPath;
    }

    this.ethersWallet = ethers.Wallet.fromMnemonic(this.mnemonic, this.derivationPath).connect(this.provider!);
    this.privateKey = this.ethersWallet.privateKey;
    this.walletType = WalletTypeEnum.Seed;
    await this.deriveInfo();
    return this;
  }

  private async deriveInfo() {
    this.publicKey = this.ethersWallet!.publicKey;
    this.privateKeyWif = this.ethersWallet!.privateKey;
    this.cashaddr = this.ethersWallet!.address;
    this.address = this.ethersWallet!.address;
    return this;
  }

  // Initialize a watch only wallet from a cash addr
  public async watchOnly(address: string) {
    this.cashaddr = address;
    this.address = address;

    this.walletType = WalletTypeEnum.Watch;

    return this;
  }

  public async generate(): Promise<this> {
    if (this.walletType === WalletTypeEnum.Wif) {
      return await this._generateWif();
    } else {
      return await this._generateMnemonic();
    }
  }

  private async _generateWif() {
    if (!this.privateKey) {
      this.ethersWallet = ethers.Wallet.createRandom().connect(this.provider!);
    }
    this.walletType = WalletTypeEnum.Wif;
    return this.deriveInfo();
  }

  private async _generateMnemonic() {
    if (!this.mnemonic) {
      this.ethersWallet = ethers.Wallet.createRandom().connect(this.provider!);
      this.mnemonic = this.ethersWallet.mnemonic.phrase;
      this.derivationPath = this.ethersWallet.mnemonic.path;
    }
    this.walletType = WalletTypeEnum.Seed;
    return await this.deriveInfo();
  }

  /**
   * fromId - create a wallet from encoded walletId string
   *
   * @param walletId   walletId options to steer the creation process
   *
   * @returns wallet instantiated accordingly to the walletId rules
   */
   public static async fromId(walletId: string) {
    return await new this()._fromId(walletId);
  }

  public _fromId = async (walletId: string): Promise<this> => {
    let [walletType, networkGiven, arg1, arg2]: string[] = walletId.split(":");
    if (!["named", "seed", "watch", "wif"].includes(walletType)) {
      throw Error(
        `Wallet type ${walletType} was passed to single address wallet`
      );
    }
    if (networkPrefixMap[this.networkPrefix] != networkGiven) {
      throw Error(
        `Network prefix ${networkGiven} to a ${
          networkPrefixMap[this.networkPrefix]
        } wallet`
      );
    }
    switch (walletType) {
      case "wif":
        return this.fromWIF(arg1);
      case "watch":
        return this.watchOnly(arg1);
      case "named":
        if (arg2) {
          return this._named(arg1, arg2);
        } else {
          return this._named(arg1);
        }

      case "seed":
        if (arg2) {
          return this.fromSeed(arg1, arg2);
        } else {
          return this.fromSeed(arg1);
        }
      default:
        return this.fromWIF(arg1);
    }
  };

  /**
   * named - create a named wallet
   *
   * @param name   user friendly wallet alias
   * @param dbName name under which the wallet will be stored in the database
   * @param force  force recreate wallet in the database if a record already exist
   *
   * @returns instantiated wallet
   */
   public static named(
    name: string,
    dbName?: string,
    force?: boolean
  ): Promise<SmartBchWallet> {
    return new this()._named(name, dbName, force);
  }

  /**
   * replaceNamed - replace (recover) named wallet with a new walletId
   *
   * If wallet with a provided name does not exist yet, it will be creted with a `walletId` supplied
   * If wallet exists it will be overwritten without exception
   *
   * @param name   user friendly wallet alias
   * @param walletId walletId options to steer the creation process
   * @param dbName name under which the wallet will be stored in the database
   *
   * @returns instantiated wallet
   */
  public static replaceNamed(
    name: string,
    walletId: string,
    dbName?: string
  ): Promise<SmartBchWallet> {
    return new this()._replaceNamed(name, walletId, dbName);
  }

  /**
   * namedExists - check if a named wallet already exists
   *
   * @param name   user friendly wallet alias
   * @param dbName name under which the wallet will be stored in the database
   *
   * @returns boolean
   */
  public static namedExists(name: string, dbName?: string): Promise<boolean> {
    return new this()._namedExists(name, dbName);
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
   public static fromSeed(
    seed: string,
    derivationPath?: string
  ): Promise<SmartBchWallet> {
    return new this().fromSeed(seed, derivationPath);
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
  public static newRandom(name: string = "", dbName?: string): Promise<SmartBchWallet> {
    return new this()._newRandom(name, dbName);
  }

  /**
   * fromWIF - create a wallet using the private key supplied in `Wallet Import Format`
   *
   * @param wif   WIF encoded private key string
   *
   * @returns instantiated wallet
   */
  public static fromWIF(wif: string): Promise<SmartBchWallet> {
    return new this().fromWIF(wif);
  }

  /**
   * watchOnly - create a watch-only wallet
   *
   * such kind of wallet does not have a private key and is unable to spend any funds
   * however it still allows to use many utility functions such as getting and watching balance, etc.
   *
   * @param address   cashaddress or slpaddress of a wallet
   *
   * @returns instantiated wallet
   */
  public static watchOnly(address: string): Promise<SmartBchWallet> {
    return new this().watchOnly(address);
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
  public static fromCashaddr(address: string): Promise<SmartBchWallet> {
    const prefix = derivePrefix(address);
    return new this(
      "",
      prefix as CashAddressNetworkPrefix,
      WalletTypeEnum.Watch
    ).watchOnly(address);
  }

  // Returns the serialized wallet as a string
  // If storing in a database, set asNamed to false to store secrets
  // In all other cases, the a named wallet is deserialized from the database
  //  by the name key
  public toString() {
    if (this.name) {
      return `named:${this.network}:${this.name}`;
    } else if (this.mnemonic) {
      return `${this.walletType}:${this.network}:${this.mnemonic}:${this.derivationPath}`;
    } else {
      return `${this.walletType}:${this.network}:${this.privateKeyWif}`;
    }
  }

  //
  public toDbString() {
    if (this.mnemonic) {
      return `${this.walletType}:${this.network}:${this.mnemonic}:${this.derivationPath}`;
    } else {
      return `${this.walletType}:${this.network}:${this.privateKeyWif}`;
    }
  }

  /**
   * send Send some amount to an address
   *
   * This is a first class function with REST analog, maintainers should strive to keep backward-compatibility
   *
   */
   public async send(
    requests:
      | SendRequest
      | Array<SendRequest>
      // | SendRequestArray[],
      ,
    options?: SendRequestOptionsI
  ): Promise<SendResponse> {
    // only one recepient for now
    const request = Array.isArray(requests) ? requests[0] : requests;

    const weiValue = BigNumber.from(await amountInSatoshi(request.value, request.unit)).mul(10**10);

    const result = await this.ethersWallet!.sendTransaction({ to: request.cashaddr, value: weiValue });
    const resp = <SendResponse>{ txId: result.hash };
    const queryBalance =
      !options || options.queryBalance === undefined || options.queryBalance;
    if (queryBalance) {
      resp.balance = (await this.getBalance()) as BalanceResponse;
    }

    resp.explorerUrl = this.explorerUrl(resp.txId!);
    return resp;
  }

  /**
   *  explorerUrl   Web url to a transaction on a block explorer
   *
   * @param txId   transaction Id
   * @returns   Url string
   */
   public explorerUrl(txId: string) {
    const explorerUrlMap = {
      mainnet: "",
      testnet: "",
      regtest: "",
    };

    return explorerUrlMap[this.network] + txId;
  }

  // gets wallet balance in sats, bch and usd
  public async getBalance(rawUnit?: string): Promise<BalanceResponse | number> {
    if (rawUnit) {
      const unit = sanitizeUnit(rawUnit);
      return await balanceFromSatoshi(
        await this.getBalanceFromProvider(),
        unit
      );
    } else {
      return await balanceResponseFromSatoshi(
        await this.getBalanceFromProvider()
      );
    }
  }

  public async getBalanceFromProvider(): Promise<number> {
    return (await (this.provider! as ethers.providers.BaseProvider).getBalance(this.cashaddr!)).div(10**10).toNumber();
  }
}

/**
 * Class to manage a testnet wallet.
 */
 export class TestNetSmartBchWallet extends SmartBchWallet {
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.testnet);
  }
}

/**
 * Class to manage a regtest wallet.
 */
 export class RegTestSmartBchWallet extends SmartBchWallet {
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.regtest);
  }
}