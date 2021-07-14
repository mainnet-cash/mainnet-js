// Stable
import { instantiateSecp256k1, instantiateSha256 } from "@bitauth/libauth";

// Unstable?
import {
  binToHex,
  CashAddressNetworkPrefix,
  decodePrivateKeyWif,
  encodePrivateKeyWif,
  deriveHdPrivateNodeFromSeed,
  deriveHdPath,
  generatePrivateKey,
  HdPrivateNodeValid,
  instantiateBIP32Crypto,
} from "@bitauth/libauth";

import { SignatureTemplate } from "cashscript";

import { mnemonicToSeedSync, generateMnemonic } from "bip39";
import { NetworkType, UnitEnum } from "../enum";

import { TxI } from "../interface";

import { networkPrefixMap } from "../enum";
import { PrivateKeyI, UtxoI } from "../interface";

import { BaseWallet } from "./Base";
import { WalletTypeEnum } from "./enum";
import { SendRequestOptionsI, MnemonicI, WalletInfoI } from "./interface";

import {
  SendRequest,
  SendRequestArray,
  SendResponse,
  UtxoItem,
  UtxoResponse,
} from "./model";

import {
  buildEncodedTransaction,
  getSuitableUtxos,
  getFeeAmount,
} from "../transaction/Wif";

import { qrAddress } from "../qr/Qr";
import { ImageI } from "../qr/interface";
import { asSendRequestObject } from "../util/asSendRequestObject";
import {
  balanceFromSatoshi,
  balanceResponseFromSatoshi,
  BalanceResponse,
} from "../util/balanceObjectFromSatoshi";
import { checkWifNetwork } from "../util/checkWifNetwork";
import { deriveCashaddr } from "../util/deriveCashaddr";
import { derivePrefix, derivePublicKeyHash } from "../util/derivePublicKeyHash";
import { getRuntimePlatform } from "../util/getRuntimePlatform";
import { sanitizeUnit } from "../util/sanitizeUnit";
import { sumUtxoValue } from "../util/sumUtxoValue";
import { sumSendRequestAmounts } from "../util/sumSendRequestAmounts";
import { ElectrumRawTransaction } from "../network/interface";
import { getRelayFeeCache } from "../network/getRelayFeeCache";
import {
  RegTestSlp,
  RegTestWatchSlp,
  RegTestWifSlp,
  Slp,
  TestNetSlp,
  TestNetWatchSlp,
  TestNetWifSlp,
  WatchSlp,
  WifSlp,
} from "./Slp";
import axios from "axios";
import { SlpSendResponse } from "../slp/interface";
import { toCashAddress } from "../util/bchaddr";
import {
  RegTestUtil,
  RegTestWatchUtil,
  RegTestWifUtil,
  TestNetUtil,
  TestNetWatchUtil,
  TestNetWifUtil,
  Util,
  WatchUtil,
  WifUtil,
} from "./Util";

const secp256k1Promise = instantiateSecp256k1();
const sha256Promise = instantiateSha256();

type WatchBalanceCancel = () => void;

/**
 * Class to manage a bitcoin cash wallet.
 */
export class Wallet extends BaseWallet {
  cashaddr?: string;
  derivationPath: string = "m/44'/0'/0'/0/0";
  mnemonic?: string;
  privateKey?: Uint8Array;
  publicKeyCompressed?: Uint8Array;
  privateKeyWif?: string;
  publicKey?: Uint8Array;
  publicKeyHash?: Uint8Array;
  walletType?: WalletTypeEnum;
  _slp?: Slp;
  _slpAware: boolean = false;
  _util?: Util;

  constructor(
    name = "",
    networkPrefix = CashAddressNetworkPrefix.mainnet,
    walletType = WalletTypeEnum.Seed
  ) {
    super(name, networkPrefix);
    this.name = name;
    this.walletType = walletType;
  }

  // interface to slp functions. see Slp.ts
  public get slp() {
    if (!this._slp) {
      this._slp = new Slp(this);
      this._slpAware = true;
    }

    return this._slp;
  }

  // interface to slp functions. see Slp.ts
  public static get slp() {
    return Slp;
  }

  // interface to util functions. see Util.ts
  public get util() {
    if (!this._util) {
      this._util = new Util(this);
    }

    return this._util;
  }

  // interface to util util. see Util.Util
  public static get util() {
    return Util;
  }

  public slpAware(value: boolean = true): Wallet {
    this._slpAware = value;
    return this;
  }

  // Initialize wallet from Wallet Import Format
  public async fromWIF(secret: string): Promise<this> {
    checkWifNetwork(secret, this.networkType);

    const sha256 = await sha256Promise;
    let wifResult = decodePrivateKeyWif(sha256, secret);

    const hasError = typeof wifResult === "string";
    if (hasError) {
      throw Error(wifResult as string);
    }
    let resultData: PrivateKeyI = wifResult as PrivateKeyI;
    this.privateKey = resultData.privateKey;
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

    const crypto = await instantiateBIP32Crypto();
    let seed = mnemonicToSeedSync(this.mnemonic);

    let hdNode = deriveHdPrivateNodeFromSeed(crypto, seed);
    if (!hdNode.valid) {
      throw Error("Invalid private key derived from mnemonic seed");
    }
    if (derivationPath) {
      this.derivationPath = derivationPath;
    }

    let zerothChild = deriveHdPath(
      crypto,
      hdNode,
      this.derivationPath
    ) as HdPrivateNodeValid;
    this.privateKey = zerothChild.privateKey;

    this.walletType = WalletTypeEnum.Seed;
    await this.deriveInfo();
    return this;
  }

  private async deriveInfo() {
    const sha256 = await sha256Promise;
    const secp256k1 = await secp256k1Promise;
    this.publicKey = secp256k1.derivePublicKeyUncompressed(this.privateKey!);
    this.publicKeyCompressed = secp256k1.derivePublicKeyCompressed(
      this.privateKey!
    );
    const networkType =
      this.networkType === NetworkType.Regtest
        ? NetworkType.Testnet
        : this.networkType;
    this.privateKeyWif = encodePrivateKeyWif(
      sha256,
      this.privateKey!,
      networkType
    );
    checkWifNetwork(this.privateKeyWif, this.networkType);

    this.cashaddr = (await deriveCashaddr(
      this.privateKey!,
      this.networkPrefix
    )) as string;
    this.publicKeyHash = derivePublicKeyHash(this.cashaddr!);
    return this;
  }
  // Initialize a watch only wallet from a cash addr
  public async watchOnly(address: string) {
    let addressComponents = address.split(":");
    let addressPrefix, addressBase;
    if (addressComponents.length === 1) {
      addressBase = addressComponents.shift() as string;
      this.cashaddr = addressBase;
      this.publicKeyHash = derivePublicKeyHash(this.cashaddr!);
    } else {
      addressPrefix = addressComponents.shift() as string;
      addressBase = addressComponents.shift() as string;
      if (addressPrefix in networkPrefixMap) {
        if (networkPrefixMap[addressPrefix] != this.network) {
          throw Error(
            `a ${addressPrefix} address cannot be watched from a ${this.network} Wallet`
          );
        }
      }
      this.cashaddr = `${addressPrefix}:${addressBase}`;
      this.publicKeyHash = derivePublicKeyHash(this.cashaddr);
    }

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
    //
    if (!this.privateKey) {
      if (getRuntimePlatform() === "node") {
        let crypto = require("crypto");
        this.privateKey = generatePrivateKey(() => crypto.randomBytes(32));
      }
      // window, webworkers, service workers
      else {
        this.privateKey = generatePrivateKey(() =>
          window.crypto.getRandomValues(new Uint8Array(32))
        );
      }
    }
    return this.deriveInfo();
  }

  private async _generateMnemonic() {
    const crypto = await instantiateBIP32Crypto();
    this.mnemonic = generateMnemonic();
    let seed = mnemonicToSeedSync(this.mnemonic!);
    let hdNode = deriveHdPrivateNodeFromSeed(crypto, seed);
    if (!hdNode.valid) {
      throw Error("Invalid private key derived from mnemonic seed");
    }

    let zerothChild = deriveHdPath(
      crypto,
      hdNode,
      this.derivationPath
    ) as HdPrivateNodeValid;
    this.privateKey = zerothChild.privateKey;

    this.walletType = WalletTypeEnum.Seed;
    return await this.deriveInfo();
  }

  /**
   *  explorerUrl   Web url to a transaction on a block explorer
   *
   * @param txId   transaction Id
   * @returns   Url string
   */
  public explorerUrl(txId: string) {
    const explorerUrlMap = {
      mainnet: "https://explorer.bitcoin.com/bch/tx/",
      testnet: "https://explorer.bitcoin.com/tbch/tx/",
      regtest: "",
    };

    return explorerUrlMap[this.network] + txId;
  }

  /**
   * send Send some amount to an address
   *
   * This is a first class function with REST analog, maintainers should strive to keep backward-compatibility
   *
   */
  public async send(
    requests: SendRequest | SendRequest[] | SendRequestArray[],
    options?: SendRequestOptionsI
  ): Promise<SendResponse> {
    let sendRequests = asSendRequestObject(requests);
    let result = await this._processSendRequests(
      sendRequests,
      undefined,
      options
    );
    let resp = new SendResponse({});
    resp.txId = result;
    const queryBalance =
      !options || options.queryBalance === undefined || options.queryBalance;
    if (queryBalance) {
      resp.balance = (await this.getBalance()) as BalanceResponse;
    }
    resp.explorerUrl = this.explorerUrl(resp.txId);
    return resp;
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
        let sanitizedAddress;
        if (arg2) {
          sanitizedAddress = `${arg1}:${arg2}`;
        } else {
          sanitizedAddress = `${derivePrefix(arg1)}:${arg1}`;
        }
        return this.watchOnly(sanitizedAddress);
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
  ): Promise<Wallet> {
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
  ): Promise<Wallet> {
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
  ): Promise<Wallet> {
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
  public static newRandom(name: string = "", dbName?: string): Promise<Wallet> {
    return new this()._newRandom(name, dbName);
  }

  /**
   * fromWIF - create a wallet using the private key supplied in `Wallet Import Format`
   *
   * @param wif   WIF encoded private key string
   *
   * @returns instantiated wallet
   */
  public static fromWIF(wif: string): Promise<Wallet> {
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
  public static watchOnly(address: string): Promise<Wallet> {
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
  public static fromCashaddr(address: string): Promise<Wallet> {
    const prefix = derivePrefix(address);
    return new this(
      "",
      prefix as CashAddressNetworkPrefix,
      WalletTypeEnum.Watch
    ).watchOnly(address);
  }

  /**
   * fromSlpaddr - create an SLP aware watch-only wallet in the network derived from the address
   *
   * such kind of wallet does not have a private key and is unable to spend any funds
   * however it still allows to use many utility functions such as getting and watching balance, etc.
   *
   * @param address   slpaddress of a wallet
   *
   * @returns instantiated wallet
   */
  public static fromSlpaddr(address: string): Promise<Wallet> {
    return this.fromCashaddr(toCashAddress(address));
  }

  public async sendMax(
    cashaddr: string,
    options?: SendRequestOptionsI
  ): Promise<SendResponse> {
    const txId = await this.sendMaxRaw(cashaddr, options);
    const queryBalance =
      !options || options.queryBalance === undefined || options.queryBalance;
    return {
      txId: txId,
      balance: queryBalance
        ? ((await this.getBalance()) as BalanceResponse)
        : undefined,
      explorerUrl: this.explorerUrl(txId),
    };
  }

  public async sendMaxRaw(cashaddr: string, options?: SendRequestOptionsI) {
    let maxSpendableAmount = await this.getMaxAmountToSend({
      outputCount: 1,
      options: options,
    });
    if (maxSpendableAmount.sat === undefined) {
      throw Error("no Max amount to send");
    }
    let sendRequest = new SendRequest({
      cashaddr: cashaddr,
      value: maxSpendableAmount.sat,
      unit: "sat",
    });
    return await this._processSendRequests([sendRequest], true, options);
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
    if (this.cashaddr) {
      return this.cashaddr;
    } else {
      throw Error("cashaddr was not set on wallet");
    }
  }

  public getDepositQr(): ImageI {
    return qrAddress(this.cashaddr as string);
  }

  //
  public async getAddressUtxos(address: string): Promise<UtxoI[]> {
    if (!this.provider) {
      throw Error("Attempting to get utxos from wallet without a client");
    }

    if (this._slpAware) {
      const [bchUtxos, slpOutpoints] = await Promise.all([
        this.provider!.getUtxos(address),
        this.slp.getSlpOutpoints(),
      ]);
      return bchUtxos.filter(
        (bchutxo) =>
          slpOutpoints.findIndex(
            (slpOutpoint) => `${bchutxo.txid}:${bchutxo.vout}` === slpOutpoint
          ) === -1
      );
    } else {
      return await this.provider!.getUtxos(address);
    }
  }

  // gets transaction history of this wallet
  public async getHistory(): Promise<TxI[]> {
    return await this.provider!.getHistory(this.cashaddr!);
  }

  // gets last transaction of this wallet
  public async getLastTransaction(
    confirmedOnly: boolean = false
  ): Promise<ElectrumRawTransaction> {
    let history: TxI[] = await this.getHistory();
    if (confirmedOnly) {
      history = history.filter((val) => val.height > 0);
    }
    const [lastTx] = history.slice(-1);
    return this.provider!.getRawTransactionObject(lastTx.tx_hash);
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

  // sets up a callback to be called upon wallet's balance change
  // can be cancelled by calling the function returned from this one
  public watchBalance(
    callback: (balance: BalanceResponse) => boolean | void
  ): WatchBalanceCancel {
    let watchBalanceCallback: () => void;
    let cancel: WatchBalanceCancel = async () => {
      await this.provider!.unsubscribeFromAddress(
        this.cashaddr!,
        watchBalanceCallback
      );
    };

    watchBalanceCallback = async () => {
      const balance = (await this.getBalance(undefined)) as BalanceResponse;
      await callback(balance);
    };
    this.provider!.subscribeToAddress(this.cashaddr!, watchBalanceCallback);

    return cancel;
  }

  // waits for address balance to be greater than or equal to the target value
  // this call halts the execution
  public async waitForBalance(
    value: number,
    rawUnit: UnitEnum = UnitEnum.BCH
  ): Promise<number | BalanceResponse> {
    return new Promise(async (resolve) => {
      const waitForBalanceCallback = async (data) => {
        if (data instanceof Array) {
          let addr = data[0] as string;
          if (addr !== this.cashaddr!) {
            return;
          }

          const balance = await this.getBalance(rawUnit);
          if (balance >= value) {
            await this.provider!.unsubscribeFromAddress(
              this.cashaddr!,
              waitForBalanceCallback
            );
            resolve(balance);
          }
        }
      };

      await this.provider!.subscribeToAddress(
        this.cashaddr!,
        waitForBalanceCallback
      );
    });
  }

  // waits for next transaction, program execution is halted
  public async waitForTransaction(
    returnTransactionInfo: boolean = true
  ): Promise<ElectrumRawTransaction | undefined> {
    return new Promise(async (resolve) => {
      const waitForTransactionCallback = async (data) => {
        if (data instanceof Array) {
          let addr = data[0] as string;
          if (addr !== this.cashaddr!) {
            return;
          }

          this.provider!.unsubscribeFromAddress(
            this.cashaddr!,
            waitForTransactionCallback
          );

          let lastTx;
          if (returnTransactionInfo) {
            lastTx = await this.getLastTransaction();
          }

          resolve(lastTx);
        }
      };
      this.provider!.subscribeToAddress(
        this.cashaddr!,
        waitForTransactionCallback
      );
    });
  }

  // Gets balance by summing value in all utxos in stats
  public async getBalanceFromUtxos(): Promise<number> {
    const utxos = await this.getAddressUtxos(this.cashaddr!);
    return await sumUtxoValue(utxos);
  }

  // Gets balance from fulcrum
  public async getBalanceFromProvider(): Promise<number> {
    // TODO not sure why getting the balance from a provider doesn't work
    if (this._slpAware) {
      return await this.getBalanceFromUtxos();
    } else {
      return await this.provider!.getBalance(this.cashaddr!);
    }
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
    };
  }

  // Return wallet info
  public getInfo(): WalletInfoI {
    return {
      cashaddr: this.cashaddr,
      isTestnet: this.isTestnet,
      name: this.name,
      network: this.network,
      seed: this.mnemonic ? this.getSeed().seed : undefined,
      derivationPath: this.mnemonic ? this.getSeed().derivationPath : undefined,
      publicKey: this.publicKey ? binToHex(this.publicKey!) : undefined,
      publicKeyHash: binToHex(this.publicKeyHash!),
      privateKey: this.privateKey ? binToHex(this.privateKey!) : undefined,
      privateKeyWif: this.privateKeyWif,
      walletId: this.toString(),
      walletDbEntry: this.toDbString(),
    };
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

  public async getMaxAmountToSend({
    outputCount = 1,
    options,
  }: {
    outputCount?: number;
    options?: SendRequestOptionsI;
  }): Promise<BalanceResponse> {
    if (!this.privateKey) {
      throw Error("Couldn't get network or private key for wallet.");
    }
    if (!this.cashaddr) {
      throw Error("attempted to send without a cashaddr");
    }

    if (options && options.slpAware) {
      this._slpAware = true;
    }

    // get inputs
    let utxos: UtxoI[];
    if (options && options.utxoIds) {
      utxos = options.utxoIds.map((utxoId) =>
        UtxoItem.fromId(utxoId).asElectrum()
      );
    } else {
      utxos = await this.getAddressUtxos(this.cashaddr);
    }

    // Get current height to assure recently mined coins are not spent.
    const bestHeight = await this.provider!.getBlockHeight();
    if (!bestHeight) {
      throw Error("Couldn't get chain height");
    }

    // simulate outputs using the sender's address
    const sendRequest = new SendRequest({
      cashaddr: this.cashaddr,
      value: 100,
      unit: "sat",
    });
    const sendRequests = Array(outputCount)
      .fill(0)
      .map(() => sendRequest);

    const fundingUtxos = await getSuitableUtxos(utxos, undefined, bestHeight);
    const relayFeePerByteInSatoshi = await getRelayFeeCache(this.provider!);
    const fee = await getFeeAmount({
      utxos: fundingUtxos,
      sendRequests: sendRequests,
      privateKey: this.privateKey,
      relayFeePerByteInSatoshi: relayFeePerByteInSatoshi,
      slpOutputs: [],
    });
    const spendableAmount = await sumUtxoValue(fundingUtxos);

    return await balanceResponseFromSatoshi(spendableAmount - fee);
  }

  /**
   * utxos Get unspent outputs for the wallet
   *
   */
  public async getUtxos() {
    if (!this.cashaddr) {
      throw Error("Attempted to get utxos without an address");
    }
    let utxos = await this.getAddressUtxos(this.cashaddr);
    let resp = new UtxoResponse();
    resp.utxos = await Promise.all(
      utxos.map(async (o: UtxoI) => {
        return UtxoItem.fromElectrum(o);
      })
    );
    return resp;
  }

  // returns the public key hash for an address
  public getPublicKey(hex = false): string | Uint8Array {
    if (this.publicKey) {
      return hex ? binToHex(this.publicKey!) : this.publicKey;
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
        ? binToHex(this.publicKeyCompressed!)
        : this.publicKeyCompressed;
    } else {
      throw Error(
        "The compressed public key for this wallet is not known, perhaps the wallet was created to watch the *hash* of a public key? i.e. a cashaddress."
      );
    }
  }

  // returns the public key hash for an address
  public getPublicKeyHash(hex = false): string | Uint8Array {
    if (this.publicKeyHash) {
      return hex ? binToHex(this.publicKeyHash!) : this.publicKeyHash;
    } else {
      throw Error(
        "The public key hash for this wallet is not known. If this wallet was created from the constructor directly, calling the deriveInfo() function may help. "
      );
    }
  }

  // get a cashscript signature
  public getSignatureTemplate() {
    return new SignatureTemplate(this.privateKeyWif as string);
  }

  /**
   * _processSendRequests given a list of sendRequests, estimate fees, build the transaction and submit it.
   * This function is an internal wrapper and may change.
   * @param  {SendRequest[]} sendRequests SendRequests
   * @param  {} discardChange=false
   * @param  {SendRequestOptionsI} options Options of the send requests
   */
  private async _processSendRequests(
    sendRequests: SendRequest[],
    discardChange = false,
    options?: SendRequestOptionsI
  ) {
    if (!this.privateKey) {
      throw new Error(
        `Wallet ${this.name} is missing either a network or private key`
      );
    }
    if (!this.cashaddr) {
      throw Error("attempted to send without a cashaddr");
    }

    if (options && options.slpAware) {
      this._slpAware = true;
    }

    // get inputs from options or query all inputs
    let utxos: UtxoI[];
    if (options && options.utxoIds) {
      utxos = options.utxoIds.map((utxoId) =>
        UtxoItem.fromId(utxoId).asElectrum()
      );
    } else {
      utxos = await this.getAddressUtxos(this.cashaddr);
    }

    const bestHeight = await this.provider!.getBlockHeight()!;
    const spendAmount = await sumSendRequestAmounts(sendRequests);

    if (utxos.length === 0) {
      throw Error("There were no Unspent Outputs");
    }
    if (typeof spendAmount !== "bigint") {
      throw Error("Couldn't get spend amount when building transaction");
    }

    const relayFeePerByteInSatoshi = await getRelayFeeCache(this.provider!);
    const feeEstimate = await getFeeAmount({
      utxos: utxos,
      sendRequests: sendRequests,
      privateKey: this.privateKey,
      relayFeePerByteInSatoshi: relayFeePerByteInSatoshi,
      slpOutputs: [],
    });

    const fundingUtxos = await getSuitableUtxos(
      utxos,
      BigInt(spendAmount) + BigInt(feeEstimate),
      bestHeight
    );
    if (fundingUtxos.length === 0) {
      throw Error(
        "The available inputs couldn't satisfy the request with fees"
      );
    }
    const fee = await getFeeAmount({
      utxos: fundingUtxos,
      sendRequests: sendRequests,
      privateKey: this.privateKey,
      relayFeePerByteInSatoshi: relayFeePerByteInSatoshi,
      slpOutputs: [],
    });
    const encodedTransaction = await buildEncodedTransaction(
      fundingUtxos,
      sendRequests,
      this.privateKey,
      fee,
      discardChange
    );
    return await this._submitTransaction(encodedTransaction);
  }

  // Submit a raw transaction
  private async _submitTransaction(transaction: Uint8Array): Promise<string> {
    if (!this.provider) {
      throw Error("Wallet network provider was not initialized");
    }
    let rawTransaction = binToHex(transaction);
    return await this.provider.sendRawTransaction(rawTransaction);
    // return await (this.provider as ElectrumNetworkProvider).sendRawTransactionFast(rawTransaction, this.cashaddr!);
  }

  // Convenience wrapper to sign interface
  public async sign(message: string) {
    return await BaseWallet.signedMessage.sign(message, this.privateKey!);
  }

  // Convenience wrapper to verify interface
  public async verify(message: string, sig: string, publicKey?: Uint8Array) {
    return await BaseWallet.signedMessage.verify(
      message,
      sig,
      this.cashaddr!,
      publicKey
    );
  }
}

/**
 * Class to manage a testnet wallet.
 */
export class TestNetWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.testnet;
  static faucetServer = "https://rest-unstable.mainnet.cash";
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.testnet);
  }

  // will receive 10000 testnet satoshi, rate limits apply
  async getTestnetSatoshis(): Promise<string> {
    try {
      const response = await axios.post(
        `${TestNetWallet.faucetServer}/faucet/get_testnet_bch`,
        { cashaddr: this.cashaddr! }
      );
      const data = response.data;
      return data.txId;
    } catch (e) {
      // console.log(e);
      // console.log(e.response ? e.response.data : "");
      throw e;
    }
  }

  // be nice and return them back
  async returnTestnetSatoshis(): Promise<SendResponse> {
    try {
      const response = await axios.post(
        `${TestNetWallet.faucetServer}/faucet/get_addresses`
      );
      const data = response.data;
      return await this.slpAware().sendMax(data.bchtest);
    } catch (e: any) {
      console.log(e);
      console.log(e.response ? e.response.data : "");
      throw e;
    }
  }

  // will receive 10 testnet tokens, rate limits apply
  async getTestnetSlp(tokenId: string): Promise<string> {
    try {
      const response = await axios.post(
        `${TestNetWallet.faucetServer}/faucet/get_testnet_slp`,
        { slpaddr: this.slp.slpaddr, tokenId: tokenId }
      );
      const data = response.data;
      return data.txId;
    } catch (e) {
      //console.log(e);
      //console.log(e.response ? e.response.data : "");
      throw e;
    }
  }

  // be nice and return them back
  async returnTestnetSlp(tokenId: string): Promise<SlpSendResponse> {
    try {
      const response = await axios.post(
        `${TestNetWallet.faucetServer}/faucet/get_addresses`
      );
      const data = response.data;
      return await this.slp.sendMax(data.slptest, tokenId);
    } catch (e: any) {
      console.log(e);
      console.log(e.response ? e.response.data : "");
      throw e;
    }
  }

  // interface to static slp functions. see Slp.ts
  public static get slp() {
    return TestNetSlp;
  }

  // interface to static util functions. see Util.ts
  public static get util() {
    return TestNetUtil;
  }
}

/**
 * Class to manage a regtest wallet.
 */
export class RegTestWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.regtest;
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.regtest);
  }

  // interface to static slp functions. see Slp.ts
  public static get slp() {
    return RegTestSlp;
  }

  // interface to static util functions. see Util.ts
  public static get util() {
    return RegTestUtil;
  }
}

/**
 * Class to manage a bitcoin cash wif wallet.
 */
export class WifWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.mainnet;
  static walletType = WalletTypeEnum.Wif;
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.mainnet, WalletTypeEnum.Wif);
  }

  // interface to static slp functions. see Slp.ts
  public static get slp() {
    return WifSlp;
  }

  // interface to static util functions. see Util.ts
  public static get util() {
    return WifUtil;
  }
}

/**
 * Class to manage a testnet wif wallet.
 */
export class TestNetWifWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.testnet;
  static walletType = WalletTypeEnum.Wif;
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.testnet, WalletTypeEnum.Wif);
  }

  // interface to static slp functions. see Slp.ts
  public static get slp() {
    return TestNetWifSlp;
  }

  // interface to static util functions. see Util.ts
  public static get util() {
    return TestNetWifUtil;
  }
}

/**
 * Class to manage a regtest wif wallet.
 */
export class RegTestWifWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.regtest;
  static walletType = WalletTypeEnum.Wif;
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.regtest, WalletTypeEnum.Wif);
  }

  // interface to static slp functions. see Slp.ts
  public static get slp() {
    return RegTestWifSlp;
  }

  // interface to static util functions. see Util.ts
  public static get util() {
    return RegTestWifUtil;
  }
}

/**
 * Class to manage a bitcoin cash watch wallet.
 */
export class WatchWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.mainnet;
  static walletType = WalletTypeEnum.Watch;
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.mainnet, WalletTypeEnum.Watch);
  }

  // interface to static slp functions. see Slp.ts
  public static get slp() {
    return WatchSlp;
  }

  // interface to static util functions. see Util.ts
  public static get util() {
    return WatchUtil;
  }
}

/**
 * Class to manage a testnet watch wallet.
 */
export class TestNetWatchWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.testnet;
  static walletType = WalletTypeEnum.Watch;
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.testnet, WalletTypeEnum.Watch);
  }

  // interface to static slp functions. see Slp.ts
  public static get slp() {
    return TestNetWatchSlp;
  }

  // interface to static util functions. see Util.ts
  public static get util() {
    return TestNetWatchUtil;
  }
}

/**
 * Class to manage a regtest watch wallet.
 */
export class RegTestWatchWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.regtest;
  static walletType = WalletTypeEnum.Watch;
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.regtest, WalletTypeEnum.Watch);
  }

  // interface to static slp functions. see Slp.ts
  public static get slp() {
    return RegTestWatchSlp;
  }

  // interface to static util functions. see Util.ts
  public static get util() {
    return RegTestWatchUtil;
  }
}
