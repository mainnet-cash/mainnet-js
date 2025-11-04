import {
  binToHex,
  CashAddressNetworkPrefix,
  CashAddressType,
  decodeCashAddress,
  encodeCashAddress,
} from "@bitauth/libauth";
import { DUST_UTXO_THRESHOLD } from "../constant.js";
import StorageProvider from "../db/StorageProvider.js";
import {
  networkPrefixMap,
  NetworkType,
  prefixFromNetworkMap,
  UnitEnum,
} from "../enum.js";
import { getAddressHistory } from "../history/electrumTransformer.js";
import { TransactionHistoryItem } from "../history/interface.js";
import { HexHeaderI, NFTCapability, TxI, UtxoI } from "../interface.js";
import { SignedMessage } from "../message/signed.js";
import { getNetworkProvider } from "../network/default.js";
import ElectrumNetworkProvider from "../network/ElectrumNetworkProvider.js";
import { getRelayFeeCache } from "../network/getRelayFeeCache.js";
import { ElectrumRawTransaction } from "../network/interface.js";
import {
  buildEncodedTransaction,
  getFeeAmount,
  getFeeAmountSimple,
  getSuitableUtxos,
} from "../transaction/Wif.js";
import {
  balanceFromSatoshi,
  BalanceResponse,
  balanceResponseFromSatoshi,
} from "../util/balanceObjectFromSatoshi.js";
import { checkUtxos } from "../util/checkUtxos.js";
import { derivePrefix } from "../util/derivePublicKeyHash.js";
import {
  amountInSatoshi,
  asSendRequestObject,
  deriveTokenaddr,
  getRuntimePlatform,
  hexToBin,
  sumTokenAmounts,
  sumUtxoValue,
  toTokenaddr,
} from "../util/index.js";
import { sanitizeUnit } from "../util/sanitizeUnit.js";
import { sumSendRequestAmounts } from "../util/sumSendRequestAmounts.js";
import { FeePaidByEnum, WalletTypeEnum } from "./enum.js";
import {
  CancelFn,
  SendRequestOptionsI,
  WaitForTransactionOptions,
  WaitForTransactionResponse,
  WalletI,
  WalletInfoI,
} from "./interface.js";
import {
  fromUtxoId,
  OpReturnData,
  SendRequest,
  SendRequestArray,
  SendRequestType,
  SendResponse,
  TokenBurnRequest,
  TokenGenesisRequest,
  TokenMintRequest,
  TokenSendRequest,
} from "./model.js";
import { Util } from "./Util.js";
import { Wallet } from "./Wif.js";

const placeholderPrivateKey =
  "0000000000000000000000000000000000000000000000000000000000000001";

/**
 * A class to hold features used by all wallets
 * @class  BaseWallet
 */
export class BaseWallet implements WalletI {
  public static StorageProvider?: typeof StorageProvider;

  readonly provider: ElectrumNetworkProvider;
  readonly network: NetworkType;
  readonly walletType: WalletTypeEnum;
  _slpSemiAware: boolean = false; // a flag which requires an utxo to have more than 546 sats to be spendable and counted in the balance
  readonly publicKeyHash!: Uint8Array;
  readonly cashaddr!: string;
  readonly tokenaddr!: string;
  readonly isTestnet: boolean;
  name: string = "";
  _util?: Util;

  public get networkPrefix(): CashAddressNetworkPrefix {
    return prefixFromNetworkMap[this.network];
  }

  // interface to util functions. see Util.ts
  public get util() {
    if (!this._util) {
      this._util = new Util(this.network);
    }

    return this._util;
  }

  // interface to util util. see Util.Util
  public static get util() {
    return new this().util;
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

  public slpSemiAware(value: boolean = true): this {
    this._slpSemiAware = value;
    return this;
  }

  //#region Accessors
  protected getNetworkProvider(
    // @ts-ignore
    network: NetworkType = NetworkType.Mainnet
  ): any {
    return getNetworkProvider(network);
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
   * getTokenDepositAddress - get a cashtoken aware wallet deposit address
   *
   * @returns The cashtoken aware deposit address as a string
   */
  public getTokenDepositAddress(): string {
    return this.tokenaddr;
  }
  //#endregion Accessors

  //#region Constructors and Statics
  /**
   * constructor for a new wallet
   * @param network              network for wallet
   *
   * @throws {Error} if called on BaseWallet
   */
  constructor(network = NetworkType.Mainnet) {
    this.network = network;
    this.walletType = WalletTypeEnum.Watch;
    this.provider = this.getNetworkProvider(this.network);
    this.isTestnet = this.network === NetworkType.Mainnet ? false : true;
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
  public static async watchOnly<T extends typeof BaseWallet>(
    this: T,
    address: string
  ) {
    return new this().watchOnly(address) as InstanceType<T>;
  }
  //#endregion Constructors

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
    dbName = dbName ? dbName : prefixFromNetworkMap[this.network];
    const db = getStorageProvider(dbName);

    // If there is a database, force saving or error
    if (db) {
      await db.init();
      const savedWalletRecord = await db.getWallet(name);
      if (savedWalletRecord) {
        await db.close();
        if (forceNew) {
          throw Error(
            `A wallet with the name ${name} already exists in ${dbName}`
          );
        }
        const recoveredWallet = await this.fromId(savedWalletRecord.wallet);
        recoveredWallet.name = savedWalletRecord.name;
        return recoveredWallet;
      } else {
        const wallet = await this.generate();
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
    dbName = dbName ? dbName : prefixFromNetworkMap[this.network];
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
    dbName = dbName ? dbName : prefixFromNetworkMap[this.network];
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

  protected async generate(): Promise<this> {
    return this;
  }

  //#region Serialization
  /**
   * toDbString - store the serialized version of the wallet in the database, not just the name
   *
   * @throws {Error} if called on BaseWallet
   */
  public toDbString(): string {
    return `${this.walletType}:${this.network}:${this.getDepositAddress()}`;
  }

  // Returns the serialized wallet as a string
  // If storing in a database, set asNamed to false to store secrets
  // In all other cases, the a named wallet is deserialized from the database
  //  by the name key
  public toString() {
    return `${this.walletType}:${this.network}:${this.getDepositAddress()}`;
  }
  //#endregion Serialization

  /**
   *  explorerUrl   Web url to a transaction on a block explorer
   *
   * @param txId   transaction Id
   * @returns   Url string
   */
  public explorerUrl(txId: string) {
    const explorerUrlMap = {
      mainnet: "https://blockchair.com/bitcoin-cash/transaction/",
      testnet: "https://www.blockchain.com/bch-testnet/tx/",
      regtest: "",
    };

    return explorerUrlMap[this.network] + txId;
  }

  // returns the public key hash for an address
  public getPublicKeyHash(hex = false): string | Uint8Array {
    if (this.publicKeyHash) {
      return hex ? binToHex(this.publicKeyHash) : this.publicKeyHash;
    } else {
      throw Error(
        "The public key hash for this wallet is not known. If this wallet was created from the constructor directly, calling the deriveInfo() function may help. "
      );
    }
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
  public static async fromCashaddr<T extends typeof BaseWallet>(
    this: T,
    address: string
  ): Promise<InstanceType<T>> {
    const prefix = derivePrefix(address);
    const networkType = networkPrefixMap[prefix] as NetworkType;
    return new this(networkType).watchOnly(address) as InstanceType<T>;
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
  public static async fromTokenaddr<T extends typeof BaseWallet>(
    this: T,
    address: string
  ): Promise<InstanceType<T>> {
    const prefix = derivePrefix(address);
    const networkType = networkPrefixMap[prefix] as NetworkType;
    return new this(networkType).watchOnly(address) as InstanceType<T>;
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
  public static async named<T extends typeof Wallet>(
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
  public static async replaceNamed<T extends typeof Wallet>(
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
    const addressComponents = address.split(":");
    let addressPrefix: string;
    let addressBase: string;
    if (addressComponents.length === 1) {
      addressBase = addressComponents.shift() as string;
      addressPrefix = derivePrefix(addressBase);
    } else {
      addressPrefix = addressComponents.shift() as string;
      addressBase = addressComponents.shift() as string;
      if (addressPrefix in networkPrefixMap) {
        if (networkPrefixMap[addressPrefix] !== this.network) {
          throw Error(
            `a ${addressPrefix} address cannot be watched from a ${this.network} Wallet`
          );
        }
      }
    }

    const prefixedAddress = `${addressPrefix}:${addressBase}`;

    // check if a token aware address was provided
    const addressData = decodeCashAddress(prefixedAddress);
    if (typeof addressData === "string") throw addressData;

    // @ts-ignore
    this.publicKeyHash = addressData.payload;

    let nonTokenAwareType = addressData.type;
    if (nonTokenAwareType == CashAddressType.p2pkhWithTokens)
      nonTokenAwareType = CashAddressType.p2pkh;
    if (nonTokenAwareType == CashAddressType.p2shWithTokens)
      nonTokenAwareType = CashAddressType.p2sh;
    if (nonTokenAwareType == CashAddressType.p2pkh)
      // @ts-ignore
      this.publicKeyHash = addressData.payload;

    // @ts-ignore
    this.cashaddr = encodeCashAddress({
      prefix: addressData.prefix as CashAddressNetworkPrefix,
      type: nonTokenAwareType,
      payload: addressData.payload,
    }).address;
    // @ts-ignore
    this.tokenaddr = deriveTokenaddr(addressData.payload, this.networkPrefix);

    return this;
  }
  //#region Funds
  /**
   * utxos Get unspent outputs for the wallet
   *
   */
  public async getUtxos() {
    if (!this.cashaddr) {
      throw Error("Attempted to get utxos without an address");
    }
    return await this.getAddressUtxos(this.cashaddr);
  }

  // gets wallet balance in sats, bch and currency
  public async getBalance(
    rawUnit?: string,
    priceCache = true
  ): Promise<BalanceResponse | number> {
    if (rawUnit) {
      const unit = sanitizeUnit(rawUnit);
      return await balanceFromSatoshi(
        await this.getBalanceFromProvider(),
        unit,
        priceCache
      );
    } else {
      return await balanceResponseFromSatoshi(
        await this.getBalanceFromProvider(),
        priceCache
      );
    }
  }

  // Gets balance by summing value in all utxos in stats
  public async getBalanceFromUtxos(): Promise<number> {
    const utxos = (await this.getAddressUtxos(this.cashaddr)).filter(
      (val) => val.token === undefined
    );
    return sumUtxoValue(utxos);
  }

  // Gets balance from fulcrum
  public async getBalanceFromProvider(): Promise<number> {
    // Fulcrum reports balance of all utxos, including tokens, which is undesirable
    // // TODO not sure why getting the balance from a provider doesn't work
    // if (this._slpAware || this._slpSemiAware) {
    //   return await this.getBalanceFromUtxos();
    // } else {
    //   return await this.provider.getBalance(this.cashaddr);
    // }

    // FIXME
    return this.getBalanceFromUtxos();
  }

  public async getAddressUtxos(address?: string): Promise<UtxoI[]> {
    if (!address) {
      address = this.cashaddr;
    }

    if (this._slpSemiAware) {
      const bchUtxos: UtxoI[] = await this.provider.getUtxos(address);
      return bchUtxos.filter(
        (bchutxo) => bchutxo.satoshis > DUST_UTXO_THRESHOLD
      );
    } else {
      return await this.provider.getUtxos(address);
    }
  }

  // watching for any transaction hash of this wallet
  public async watchAddress(
    callback: (txHash: string) => void
  ): Promise<CancelFn> {
    return this.provider.watchAddress(this.getDepositAddress(), callback);
  }

  // watching for any transaction of this wallet
  public async watchAddressTransactions(
    callback: (tx: ElectrumRawTransaction) => void
  ): Promise<CancelFn> {
    return this.provider.watchAddressTransactions(
      this.getDepositAddress(),
      callback
    );
  }

  // watching for cashtoken transaction of this wallet
  public async watchAddressTokenTransactions(
    callback: (tx: ElectrumRawTransaction) => void
  ): Promise<CancelFn> {
    return this.provider.watchAddressTokenTransactions(
      this.getDepositAddress(),
      callback
    );
  }

  // sets up a callback to be called upon wallet's balance change
  // can be cancelled by calling the function returned from this one
  public async watchBalance(
    callback: (balance: BalanceResponse) => void
  ): Promise<CancelFn> {
    return this.provider.watchAddressStatus(
      this.getDepositAddress(),
      async (_status: string) => {
        const balance = (await this.getBalance()) as BalanceResponse;
        callback(balance);
      }
    );
  }

  // sets up a callback to be called upon wallet's BCH or USD balance change
  // if BCH balance does not change, the callback will be triggered every
  // @param `usdPriceRefreshInterval` milliseconds by polling for new BCH USD price
  // Since we want to be most sensitive to usd value change, we do not use the cached exchange rates
  // can be cancelled by calling the function returned from this one
  public async watchBalanceUsd(
    callback: (balance: BalanceResponse) => void,
    usdPriceRefreshInterval = 30000
  ): Promise<CancelFn> {
    let usdPrice = -1;

    const _callback = async () => {
      const balance = (await this.getBalance(
        undefined,
        false
      )) as BalanceResponse;
      if (usdPrice !== balance.usd!) {
        usdPrice = balance.usd;
        callback(balance);
      }
    };

    const watchCancel = await this.provider.watchAddressStatus(
      this.getDepositAddress(),
      _callback
    );
    const interval = setInterval(_callback, usdPriceRefreshInterval);

    return async () => {
      await watchCancel?.();
      clearInterval(interval);
    };
  }

  // waits for address balance to be greater than or equal to the target value
  // this call halts the execution
  public async waitForBalance(
    value: number,
    rawUnit: UnitEnum = UnitEnum.BCH
  ): Promise<BalanceResponse> {
    return new Promise(async (resolve) => {
      let watchCancel: CancelFn;
      watchCancel = await this.watchBalance(
        async (balance: BalanceResponse) => {
          const satoshiBalance = await amountInSatoshi(value, rawUnit);
          if (balance.sat! >= satoshiBalance) {
            await watchCancel?.();
            resolve(balance);
          }
        }
      );
    });
  }

  // sets up a callback to be called upon wallet's token balance change
  // can be cancelled by calling the function returned from this one
  public async watchTokenBalance(
    tokenId: string,
    callback: (balance: bigint) => void
  ): Promise<CancelFn> {
    let previous: bigint | undefined = undefined;
    return await this.provider.watchAddressStatus(
      this.getDepositAddress(),
      async (_status: string) => {
        const balance = await this.getTokenBalance(tokenId);
        if (previous != balance) {
          callback(balance);
        }
        previous = balance;
      }
    );
  }

  // waits for address token balance to be greater than or equal to the target amount
  // this call halts the execution
  public async waitForTokenBalance(
    tokenId: string,
    amount: bigint
  ): Promise<bigint> {
    return new Promise(async (resolve) => {
      let watchCancel: CancelFn;
      watchCancel = await this.watchTokenBalance(
        tokenId,
        async (balance: bigint) => {
          if (balance >= amount) {
            await watchCancel?.();
            resolve(balance);
          }
        }
      );
    });
  }

  protected async _getMaxAmountToSend(
    params: {
      outputCount?: number;
      options?: SendRequestOptionsI;
      privateKey?: Uint8Array;
    } = {
      outputCount: 1,
      options: {},
    }
  ): Promise<{ value: number; utxos: UtxoI[] }> {
    if (!params.privateKey && params.options?.buildUnsigned !== true) {
      throw Error("Couldn't get network or private key for wallet.");
    }
    if (!this.cashaddr) {
      throw Error("attempted to send without a cashaddr");
    }

    if (params.options && params.options.slpSemiAware) {
      this._slpSemiAware = true;
    }

    let feePaidBy;
    if (params.options && params.options.feePaidBy) {
      feePaidBy = params.options.feePaidBy;
    } else {
      feePaidBy = FeePaidByEnum.change;
    }

    // get inputs
    let utxos: UtxoI[];
    if (params.options && params.options.utxoIds) {
      utxos = await checkUtxos(
        params.options.utxoIds.map((utxoId: UtxoI | string) =>
          typeof utxoId === "string" ? fromUtxoId(utxoId) : utxoId
        ),
        this as any
      );
    } else {
      utxos = (await this.getAddressUtxos(this.cashaddr)).filter(
        (utxo) => !utxo.token
      );
    }

    // Get current height to assure recently mined coins are not spent.
    const bestHeight = await this.provider.getBlockHeight();

    // simulate outputs using the sender's address
    const sendRequest = new SendRequest({
      cashaddr: this.cashaddr,
      value: 100,
      unit: "sat",
    });
    const sendRequests = Array(params.outputCount)
      .fill(0)
      .map(() => sendRequest);

    const fundingUtxos = await getSuitableUtxos(
      utxos,
      undefined,
      bestHeight,
      feePaidBy,
      sendRequests
    );
    const relayFeePerByteInSatoshi = await getRelayFeeCache(this.provider);
    const fee = await getFeeAmountSimple({
      utxos: fundingUtxos,
      sendRequests: sendRequests,
      privateKey: params.privateKey ?? hexToBin(placeholderPrivateKey),
      sourceAddress: this.cashaddr,
      relayFeePerByteInSatoshi: relayFeePerByteInSatoshi,
      feePaidBy: feePaidBy,
    });
    const spendableAmount = sumUtxoValue(fundingUtxos);

    let result = spendableAmount - fee;
    if (result < 0) {
      result = 0;
    }

    return { value: result, utxos: fundingUtxos };
  }

  public async getMaxAmountToSend(
    params: {
      outputCount?: number;
      options?: SendRequestOptionsI;
    } = {
      outputCount: 1,
      options: {},
    }
  ): Promise<BalanceResponse> {
    const { value: result } = await this._getMaxAmountToSend(params);

    return await balanceResponseFromSatoshi(result);
  }

  /**
   * send Send some amount to an address
   * this function processes the send requests, encodes the transaction, sends it to the network
   * @returns (depending on the options parameter) the transaction id, new address balance and a link to the transaction on the blockchain explorer
   *
   * This is a first class function with REST analog, maintainers should strive to keep backward-compatibility
   *
   */
  public async send(
    requests:
      | SendRequest
      | TokenSendRequest
      | OpReturnData
      | Array<SendRequest | TokenSendRequest | OpReturnData>
      | SendRequestArray[],
    options?: SendRequestOptionsI
  ): Promise<SendResponse> {
    const { encodedTransaction, tokenIds, sourceOutputs } =
      await this.encodeTransaction(requests, undefined, options);

    const resp = new SendResponse({});
    resp.tokenIds = tokenIds;

    if (options?.buildUnsigned !== true) {
      const txId = await this.submitTransaction(
        encodedTransaction,
        options?.awaitTransactionPropagation === undefined ||
          options?.awaitTransactionPropagation === true
      );

      resp.txId = txId;
      resp.explorerUrl = this.explorerUrl(resp.txId);

      if (
        options?.queryBalance === undefined ||
        options?.queryBalance === true
      ) {
        resp.balance = (await this.getBalance()) as BalanceResponse;
      }
    } else {
      resp.unsignedTransaction = binToHex(encodedTransaction);
      resp.sourceOutputs = sourceOutputs;
    }

    return resp;
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
    return await this.sendMaxRaw(cashaddr, options);
  }

  /**
   * sendMaxRaw (internal) Send all available funds to a destination cash address
   *
   * @param  {string} cashaddr destination cash address
   * @param  {SendRequestOptionsI} options Options of the send requests
   *
   * @returns the transaction id sent to the network
   */
  protected async sendMaxRaw(
    cashaddr: string,
    options?: SendRequestOptionsI,
    privateKey?: Uint8Array
  ): Promise<SendResponse> {
    const { value: maxSpendableAmount, utxos } = await this._getMaxAmountToSend(
      {
        outputCount: 1,
        options: options,
        privateKey: privateKey,
      }
    );

    if (!options) {
      options = {};
    }

    options.utxoIds = utxos;

    const sendRequest = new SendRequest({
      cashaddr: cashaddr,
      value: maxSpendableAmount,
      unit: "sat",
    });

    const { encodedTransaction, tokenIds, sourceOutputs } =
      await this.encodeTransaction([sendRequest], true, options, privateKey);

    const resp = new SendResponse({});
    resp.tokenIds = tokenIds;

    if (options?.buildUnsigned !== true) {
      const txId = await this.submitTransaction(
        encodedTransaction,
        options?.awaitTransactionPropagation === undefined ||
          options?.awaitTransactionPropagation === true
      );

      resp.txId = txId;
      resp.explorerUrl = this.explorerUrl(resp.txId);

      if (
        options?.queryBalance === undefined ||
        options?.queryBalance === true
      ) {
        resp.balance = (await this.getBalance()) as BalanceResponse;
      }
    } else {
      resp.unsignedTransaction = binToHex(encodedTransaction);
      resp.sourceOutputs = sourceOutputs;
    }

    return resp;
  }

  /**
   * encodeTransaction Encode and sign a transaction given a list of sendRequests, options and estimate fees.
   * @param  {SendRequest[]} sendRequests SendRequests
   * @param  {boolean} discardChange=false
   * @param  {SendRequestOptionsI} options Options of the send requests
   */
  protected async encodeTransaction(
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
    let sendRequests = asSendRequestObject(requests);

    if (!privateKey && options?.buildUnsigned !== true) {
      throw new Error(`Missing private key`);
    }

    if (options && options.slpSemiAware) {
      this._slpSemiAware = true;
    }

    let feePaidBy;
    if (options && options.feePaidBy) {
      feePaidBy = options.feePaidBy;
    } else {
      feePaidBy = FeePaidByEnum.change;
    }

    let changeAddress;
    if (options && options.changeAddress) {
      changeAddress = options.changeAddress;
    } else {
      changeAddress = this.cashaddr;
    }

    let checkTokenQuantities: boolean = true;
    if (options && options.checkTokenQuantities === false) {
      checkTokenQuantities = false;
    }

    // get inputs from options or query all inputs
    let utxos: UtxoI[];
    if (options && options.utxoIds) {
      utxos = await checkUtxos(
        options.utxoIds.map((utxoId: UtxoI | string) =>
          typeof utxoId === "string" ? fromUtxoId(utxoId) : utxoId
        ),
        this as any
      );
    } else {
      utxos = await this.getAddressUtxos(this.cashaddr);
    }

    // filter out token utxos if there are no token requests
    if (
      checkTokenQuantities &&
      !sendRequests.some((val) => val instanceof TokenSendRequest)
    ) {
      utxos = utxos.filter((val) => !val.token);
    }

    const addTokenChangeOutputs = (
      inputs: UtxoI[],
      outputs: SendRequestType[]
    ) => {
      // Allow for implicit token burn if the total amount sent is less than user had
      // allow for token genesis, creating more tokens than we had before (0)
      if (!checkTokenQuantities) {
        return;
      }
      const allTokenInputs = inputs.filter((val) => val.token);
      const allTokenOutputs = outputs.filter(
        (val) => val instanceof TokenSendRequest
      ) as TokenSendRequest[];
      const tokenIds = allTokenOutputs
        .map((val) => val.tokenId)
        .filter((val, idx, arr) => arr.indexOf(val) === idx);
      for (let tokenId of tokenIds) {
        const tokenInputs = allTokenInputs.filter(
          (val) => val.token?.tokenId === tokenId
        );
        const inputAmountSum = tokenInputs.reduce(
          (prev, cur) => prev + cur.token!.amount,
          0n
        );
        const tokenOutputs = allTokenOutputs.filter(
          (val) => val.tokenId === tokenId
        );
        const outputAmountSum = tokenOutputs.reduce(
          (prev, cur) => prev + cur.amount,
          0n
        );

        const diff = inputAmountSum - outputAmountSum;
        if (diff < 0) {
          throw new Error("Not enough token amount to send");
        }
        if (diff >= 0) {
          let available = 0n;
          let change = 0n;
          const ensureUtxos: UtxoI[] = [];
          for (const token of tokenInputs.filter((val) => val.token?.amount)) {
            ensureUtxos.push(token);
            available += token.token!.amount;
            if (available >= outputAmountSum) {
              change = available - outputAmountSum;
              //break;
            }
          }
          if (ensureUtxos.length) {
            if (!options) {
              options = {};
            }
            options!.ensureUtxos = [
              ...(options.ensureUtxos ?? []),
              ...ensureUtxos,
            ].filter(
              (val, index, array) =>
                array.findIndex(
                  (other) => other.txid === val.txid && other.vout === val.vout
                ) === index
            );
          }
          if (change > 0) {
            outputs.push(
              new TokenSendRequest({
                cashaddr: toTokenaddr(changeAddress) || this.tokenaddr,
                amount: change,
                tokenId: tokenId,
                commitment: tokenOutputs[0].commitment,
                capability: tokenOutputs[0].capability,
                value: tokenOutputs[0].value,
              })
            );
          }
        }
      }
    };
    addTokenChangeOutputs(utxos, sendRequests);

    const bestHeight = await this.provider.getBlockHeight();
    const spendAmount = await sumSendRequestAmounts(sendRequests);

    if (utxos.length === 0) {
      throw Error("There were no Unspent Outputs");
    }
    if (typeof spendAmount !== "bigint") {
      throw Error("Couldn't get spend amount when building transaction");
    }

    const relayFeePerByteInSatoshi = await getRelayFeeCache(this.provider);
    const feeEstimate = await getFeeAmountSimple({
      utxos: utxos,
      sendRequests: sendRequests,
      privateKey: privateKey ?? hexToBin(placeholderPrivateKey),
      sourceAddress: this.cashaddr,
      relayFeePerByteInSatoshi: relayFeePerByteInSatoshi,
      feePaidBy: feePaidBy,
    });

    const fundingUtxos = await getSuitableUtxos(
      utxos,
      BigInt(spendAmount) + BigInt(Math.ceil(feeEstimate)),
      bestHeight,
      feePaidBy,
      sendRequests,
      options?.ensureUtxos || [],
      options?.tokenOperation
    );
    if (fundingUtxos.length === 0) {
      throw Error(
        "The available inputs couldn't satisfy the request with fees"
      );
    }
    const fee = await getFeeAmount({
      utxos: fundingUtxos,
      sendRequests: sendRequests,
      privateKey: privateKey ?? hexToBin(placeholderPrivateKey),
      sourceAddress: this.cashaddr,
      relayFeePerByteInSatoshi: relayFeePerByteInSatoshi,
      feePaidBy: feePaidBy,
    });
    const { encodedTransaction, sourceOutputs } = await buildEncodedTransaction(
      {
        inputs: fundingUtxos,
        outputs: sendRequests,
        signingKey: privateKey ?? hexToBin(placeholderPrivateKey),
        sourceAddress: this.cashaddr,
        fee,
        discardChange,
        feePaidBy,
        changeAddress,
        buildUnsigned: options?.buildUnsigned === true,
      }
    );

    const tokenIds = [
      ...fundingUtxos
        .filter((val) => val.token?.tokenId)
        .map((val) => val.token!.tokenId),
      ...sendRequests
        .filter((val) => val instanceof TokenSendRequest)
        .map((val) => (val as TokenSendRequest).tokenId),
    ].filter((value, index, array) => array.indexOf(value) === index);

    return { encodedTransaction, tokenIds, sourceOutputs };
  }

  // Submit a raw transaction
  public async submitTransaction(
    transaction: Uint8Array,
    awaitPropagation: boolean = true
  ): Promise<string> {
    if (!this.provider) {
      throw Error("Wallet network provider was not initialized");
    }
    let rawTransaction = binToHex(transaction);
    return await this.provider.sendRawTransaction(
      rawTransaction,
      awaitPropagation
    );
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
  }): Promise<TransactionHistoryItem[]> {
    return getAddressHistory({
      address: this.cashaddr,
      provider: this.provider,
      unit,
      fromHeight,
      toHeight,
      start,
      count,
    });
  }

  // gets last transaction of this wallet
  public async getLastTransaction(
    confirmedOnly: boolean = false
  ): Promise<ElectrumRawTransaction | null> {
    let history: TxI[] = await this.getRawHistory();
    if (confirmedOnly) {
      history = history.filter((val) => val.height > 0);
    }

    if (!history.length) {
      return null;
    }

    const [lastTx] = history.slice(-1);
    return this.provider.getRawTransactionObject(lastTx.tx_hash);
  }

  // waits for next transaction, program execution is halted
  public async waitForTransaction(
    options: WaitForTransactionOptions = {
      getTransactionInfo: true,
      getBalance: false,
      txHash: undefined,
    }
  ): Promise<WaitForTransactionResponse> {
    if (options.getTransactionInfo === undefined) {
      options.getTransactionInfo = true;
    }

    return new Promise(async (resolve) => {
      let txHashSeen = false;

      const makeResponse = async (txHash?: string) => {
        const response = <WaitForTransactionResponse>{};
        const promises: any[] = [undefined, undefined];

        if (options.getBalance === true) {
          promises[0] = this.getBalance();
        }

        if (options.getTransactionInfo === true) {
          if (!txHash) {
            promises[1] = this.getLastTransaction();
          } else {
            promises[1] = this.provider.getRawTransactionObject(txHash);
          }
        }

        const result = await Promise.all(promises);
        response.balance = result[0];
        response.transactionInfo = result[1];

        return response;
      };

      // waiting for a specific transaction to propagate
      if (options.txHash) {
        let cancel: CancelFn;

        const waitForTransactionCallback = async (data) => {
          if (data && data[0] === options.txHash! && data[1] !== null) {
            txHashSeen = true;
            await cancel?.();

            resolve(makeResponse(options.txHash!));
          }
        };

        cancel = await this.provider.subscribeToTransaction(
          options.txHash,
          waitForTransactionCallback
        );
        return;
      }

      // waiting for any address transaction
      let watchCancel: CancelFn;
      let initialResponseSeen = false;
      watchCancel = await this.provider.watchAddressStatus(
        this.getDepositAddress(),
        async (_status) => {
          if (initialResponseSeen) {
            await watchCancel?.();
            resolve(makeResponse());
            return;
          }

          initialResponseSeen = true;
        }
      );
    });
  }

  /**
   * watchBlocks Watch network blocks
   *
   * @param callback callback with a block header object
   * @param skipCurrentHeight if set, the notification about current block will not arrive
   *
   * @returns a function which will cancel watching upon evaluation
   */
  public async watchBlocks(
    callback: (header: HexHeaderI) => void,
    skipCurrentHeight: boolean = true
  ): Promise<CancelFn> {
    return this.provider.watchBlocks(callback, skipCurrentHeight);
  }

  /**
   * waitForBlock Wait for a network block
   *
   * @param height if specified waits for this exact blockchain height, otherwise resolves with the next block
   *
   */
  public async waitForBlock(height?: number): Promise<HexHeaderI> {
    return this.provider.waitForBlock(height);
  }

  //#endregion Funds

  // Convenience wrapper to verify interface
  public async verify(message: string, sig: string, publicKey?: Uint8Array) {
    return await new SignedMessage().verify(
      message,
      sig,
      this.cashaddr,
      publicKey
    );
  }

  //#region Cashtokens
  /**
   * Create new cashtoken, both funglible and/or non-fungible (NFT)
   * Refer to spec https://github.com/bitjson/cashtokens
   * @param  {number} genesisRequest.amount amount of *fungible* tokens to create
   * @param  {NFTCapability?} genesisRequest.capability capability of new NFT
   * @param  {string?} genesisRequest.commitment NFT commitment message
   * @param  {string?} genesisRequest.cashaddr cash address to send the created token UTXO to; if undefined will default to your address
   * @param  {number?} genesisRequest.value satoshi value to send alongside with tokens; if undefined will default to 1000 satoshi
   * @param  {SendRequestType | SendRequestType[]} sendRequests single or an array of extra send requests (OP_RETURN, value transfer, etc.) to include in genesis transaction
   * @param  {SendRequestOptionsI} options Options of the send requests
   */
  public async tokenGenesis(
    genesisRequest: TokenGenesisRequest,
    sendRequests: SendRequestType | SendRequestType[] = [],
    options?: SendRequestOptionsI
  ): Promise<SendResponse> {
    if (!Array.isArray(sendRequests)) {
      sendRequests = [sendRequests];
    }

    let utxos: UtxoI[];
    if (options && options.utxoIds) {
      utxos = await checkUtxos(
        options.utxoIds.map((utxoId: UtxoI | string) =>
          typeof utxoId === "string" ? fromUtxoId(utxoId) : utxoId
        ),
        this as any
      );
    } else {
      utxos = await this.getAddressUtxos(this.cashaddr);
    }

    const genesisInputs = utxos.filter((val) => val.vout === 0 && !val.token);
    if (genesisInputs.length === 0) {
      throw new Error(
        "No suitable inputs with vout=0 available for new token genesis"
      );
    }

    const genesisSendRequest = new TokenSendRequest({
      cashaddr: genesisRequest.cashaddr || this.tokenaddr,
      amount: genesisRequest.amount,
      value: genesisRequest.value || 1000,
      capability: genesisRequest.capability,
      commitment: genesisRequest.commitment,
      tokenId: genesisInputs[0].txid,
    });

    return this.send([genesisSendRequest, ...(sendRequests as any)], {
      ...options,
      utxoIds: utxos,
      ensureUtxos: [genesisInputs[0]],
      checkTokenQuantities: false,
      queryBalance: false,
      tokenOperation: "genesis",
    });
  }

  /**
   * Mint new NFT cashtokens using an existing minting token
   * Refer to spec https://github.com/bitjson/cashtokens
   * @param  {string} tokenId tokenId of an NFT to mint
   * @param  {TokenMintRequest | TokenMintRequest[]} mintRequests mint requests with new token properties and recipients
   * @param  {NFTCapability?} mintRequest.capability capability of new NFT
   * @param  {string?} mintRequest.commitment NFT commitment message
   * @param  {string?} mintRequest.cashaddr cash address to send the created token UTXO to; if undefined will default to your address
   * @param  {number?} mintRequest.value satoshi value to send alongside with tokens; if undefined will default to 1000 satoshi
   * @param  {boolean?} deductTokenAmount if minting token contains fungible amount, deduct from it by amount of minted tokens
   * @param  {SendRequestOptionsI} options Options of the send requests
   */
  public async tokenMint(
    tokenId: string,
    mintRequests: TokenMintRequest | Array<TokenMintRequest>,
    deductTokenAmount: boolean = false,
    options?: SendRequestOptionsI
  ): Promise<SendResponse> {
    if (tokenId?.length !== 64) {
      throw Error(`Invalid tokenId supplied: ${tokenId}`);
    }

    if (!Array.isArray(mintRequests)) {
      mintRequests = [mintRequests];
    }

    const utxos = await this.getAddressUtxos(this.cashaddr);
    const nftUtxos = utxos.filter(
      (val) =>
        val.token?.tokenId === tokenId &&
        val.token?.capability === NFTCapability.minting
    );
    if (!nftUtxos.length) {
      throw new Error(
        "You do not have any token UTXOs with minting capability for specified tokenId"
      );
    }
    const newAmount =
      deductTokenAmount && nftUtxos[0].token!.amount > 0
        ? nftUtxos[0].token!.amount - BigInt(mintRequests.length)
        : nftUtxos[0].token!.amount;
    const safeNewAmount = newAmount < 0n ? 0n : newAmount;
    const mintingInput = new TokenSendRequest({
      cashaddr: this.tokenaddr,
      tokenId: tokenId,
      capability: nftUtxos[0].token!.capability,
      commitment: nftUtxos[0].token!.commitment,
      amount: safeNewAmount,
      value: nftUtxos[0].satoshis,
    });
    return this.send(
      [
        mintingInput,
        ...mintRequests.map(
          (val) =>
            new TokenSendRequest({
              cashaddr: val.cashaddr || this.tokenaddr,
              amount: 0,
              tokenId: tokenId,
              value: val.value,
              capability: val.capability,
              commitment: val.commitment,
            })
        ),
      ],
      {
        ...options,
        ensureUtxos: [nftUtxos[0]],
        checkTokenQuantities: false,
        queryBalance: false,
        tokenOperation: "mint",
      }
    );
  }

  /**
   * Perform an explicit token burning by spending a token utxo to an OP_RETURN
   *
   * Behaves differently for fungible and non-fungible tokens:
   *  * NFTs are always "destroyed"
   *  * FTs' amount is reduced by the amount specified, if 0 FT amount is left and no NFT present, the token is "destroyed"
   *
   * Refer to spec https://github.com/bitjson/cashtokens
   * @param  {string} burnRequest.tokenId tokenId of a token to burn
   * @param  {NFTCapability} burnRequest.capability capability of the NFT token to select, optional
   * @param  {string?} burnRequest.commitment commitment of the NFT token to select, optional
   * @param  {number?} burnRequest.amount amount of fungible tokens to burn, optional
   * @param  {string?} burnRequest.cashaddr address to return token and satoshi change to
   * @param  {string?} message optional message to include in OP_RETURN
   * @param  {SendRequestOptionsI} options Options of the send requests
   */
  public async tokenBurn(
    burnRequest: TokenBurnRequest,
    message?: string,
    options?: SendRequestOptionsI
  ): Promise<SendResponse> {
    if (burnRequest.tokenId?.length !== 64) {
      throw Error(`Invalid tokenId supplied: ${burnRequest.tokenId}`);
    }

    const utxos = await this.getAddressUtxos(this.cashaddr);
    const tokenUtxos = utxos.filter(
      (val) =>
        val.token?.tokenId === burnRequest.tokenId &&
        val.token?.capability === burnRequest.capability &&
        val.token?.commitment === burnRequest.commitment
    );

    if (!tokenUtxos.length) {
      throw new Error("You do not have suitable token UTXOs to perform burn");
    }

    const totalFungibleAmount = tokenUtxos.reduce(
      (prev, cur) => prev + (cur.token?.amount || 0n),
      0n
    );
    let fungibleBurnAmount =
      burnRequest.amount && burnRequest.amount > 0 ? burnRequest.amount! : 0n;
    fungibleBurnAmount = BigInt(fungibleBurnAmount);
    const hasNFT = burnRequest.capability || burnRequest.commitment;

    let utxoIds: UtxoI[] = [];
    let changeSendRequests: TokenSendRequest[];
    if (hasNFT) {
      // does not have FT tokens, let us destroy the token completely
      if (totalFungibleAmount === 0n) {
        changeSendRequests = [];
        utxoIds.push(tokenUtxos[0]);
      } else {
        // add utxos to spend from
        let available = 0n;
        for (const token of tokenUtxos.filter((val) => val.token?.amount)) {
          utxoIds.push(token);
          available += token.token!.amount;
          if (available >= fungibleBurnAmount) {
            break;
          }
        }

        // if there are FT, reduce their amount
        const newAmount = totalFungibleAmount - fungibleBurnAmount;
        const safeNewAmount = newAmount < 0n ? 0n : newAmount;
        changeSendRequests = [
          new TokenSendRequest({
            cashaddr: burnRequest.cashaddr || this.tokenaddr,
            tokenId: burnRequest.tokenId,
            capability: burnRequest.capability,
            commitment: burnRequest.commitment,
            amount: safeNewAmount,
            value: tokenUtxos[0].satoshis,
          }),
        ];
      }
    } else {
      // if we are burning last fungible tokens, let us destroy the token completely
      if (totalFungibleAmount === fungibleBurnAmount) {
        changeSendRequests = [];
        utxoIds.push(...tokenUtxos);
      } else {
        // add utxos to spend from
        let available = 0n;
        for (const token of tokenUtxos.filter((val) => val.token?.amount)) {
          utxoIds.push(token);
          available += token.token!.amount;
          if (available >= fungibleBurnAmount) {
            break;
          }
        }

        // reduce the FT amount
        const newAmount = available - fungibleBurnAmount;
        const safeNewAmount = newAmount < 0n ? 0n : newAmount;
        changeSendRequests = [
          new TokenSendRequest({
            cashaddr: burnRequest.cashaddr || this.tokenaddr,
            tokenId: burnRequest.tokenId,
            amount: safeNewAmount,
            value: tokenUtxos.reduce((a, c) => a + c.satoshis, 0),
          }),
        ];
      }
    }

    const opReturn = OpReturnData.fromString(message || "");
    return this.send([opReturn, ...changeSendRequests], {
      ...options,
      checkTokenQuantities: false,
      queryBalance: false,
      ensureUtxos: utxoIds.length > 0 ? utxoIds : undefined,
      tokenOperation: "burn",
    });
  }

  /**
   * getTokenUtxos Get unspent token outputs for the wallet
   * will return utxos only for the specified token if `tokenId` provided
   * @param  {string?} tokenId tokenId (category) to filter utxos by, if not set will return utxos from all tokens
   * @returns  {UtxoI[]} token utxos
   */
  public async getTokenUtxos(tokenId?: string): Promise<UtxoI[]> {
    const utxos = await this.getAddressUtxos(this.cashaddr);
    return utxos.filter((val) =>
      tokenId ? val.token?.tokenId === tokenId : val.token
    );
  }

  /**
   * getTokenBalance Gets fungible token balance
   * for NFT token balance see @ref getNftTokenBalance
   * @param  {string} tokenId tokenId to get balance for
   * @returns  {bigint} fungible token balance
   */
  public async getTokenBalance(tokenId: string): Promise<bigint> {
    const utxos = (await this.getTokenUtxos(tokenId)).filter(
      (val) => val.token?.amount
    );
    return sumTokenAmounts(utxos, tokenId);
  }

  /**
   * getNftTokenBalance Gets non-fungible token (NFT) balance for a particular tokenId
   * disregards fungible token balances
   * for fungible token balance see @ref getTokenBalance
   * @param  {string} tokenId tokenId to get balance for
   * @returns  {number} non-fungible token balance
   */
  public async getNftTokenBalance(tokenId: string): Promise<number> {
    const utxos = (await this.getTokenUtxos(tokenId)).filter(
      (val) => val.token?.commitment !== undefined
    );
    return utxos.length;
  }

  /**
   * getAllTokenBalances Gets all fungible token balances in this wallet
   * @returns  {Object} a map [tokenId => balance] for all tokens in this wallet
   */
  public async getAllTokenBalances(): Promise<{ [tokenId: string]: bigint }> {
    const result = {};
    const utxos = (await this.getTokenUtxos()).filter(
      (val) => val.token?.amount
    );
    for (const utxo of utxos) {
      if (!result[utxo.token!.tokenId]) {
        result[utxo.token!.tokenId] = 0n;
      }
      result[utxo.token!.tokenId] += utxo.token!.amount;
    }
    return result;
  }

  /**
   * getAllNftTokenBalances Gets all non-fungible token (NFT) balances in this wallet
   * @returns  {Object} a map [tokenId => balance] for all NFTs in this wallet
   */
  public async getAllNftTokenBalances(): Promise<{
    [tokenId: string]: number;
  }> {
    const result = {};
    const utxos = (await this.getTokenUtxos()).filter(
      (val) => val.token?.commitment !== undefined
    );
    for (const utxo of utxos) {
      if (!result[utxo.token!.tokenId]) {
        result[utxo.token!.tokenId] = 0;
      }
      result[utxo.token!.tokenId] += 1;
    }
    return result;
  }
  //#endregion Cashtokens
}

/**
 * Class to manage a mainnet watch wallet.
 */
export class WatchWallet extends BaseWallet {
  static networkPrefix = CashAddressNetworkPrefix.mainnet;
  static walletType = WalletTypeEnum.Watch;
  constructor() {
    super(NetworkType.Mainnet);
  }
}

/**
 * Class to manage a testnet watch wallet.
 */
export class TestNetWatchWallet extends BaseWallet {
  static networkPrefix = CashAddressNetworkPrefix.testnet;
  static walletType = WalletTypeEnum.Watch;
  constructor() {
    super(NetworkType.Testnet);
  }
}

/**
 * Class to manage a regtest watch wallet.
 */
export class RegTestWatchWallet extends BaseWallet {
  static networkPrefix = CashAddressNetworkPrefix.regtest;
  static walletType = WalletTypeEnum.Watch;
  constructor() {
    super(NetworkType.Regtest);
  }
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

function getStorageProvider(dbName: string): StorageProvider | undefined {
  if (!BaseWallet.StorageProvider) {
    return undefined;
  }
  return new (BaseWallet.StorageProvider as any)(dbName);
}
