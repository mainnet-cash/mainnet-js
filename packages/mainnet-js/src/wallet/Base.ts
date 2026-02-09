import { binToHex, CashAddressNetworkPrefix } from "@bitauth/libauth";
import { WalletCache } from "../cache/walletCache.js";
import StorageProvider from "../db/StorageProvider.js";
import { NetworkType, prefixFromNetworkMap } from "../enum.js";
import { HexHeaderI, NFTCapability, TxI, Utxo, UtxoId } from "../interface.js";
import {
  SignedMessageResponseI,
  VerifyMessageResponseI,
} from "../message/interface.js";
import { getNetworkProvider } from "../network/default.js";
import ElectrumNetworkProvider from "../network/ElectrumNetworkProvider.js";
import { getRelayFeeCache } from "../network/getRelayFeeCache.js";
import { ElectrumRawTransaction } from "../network/interface.js";
import {
  buildEncodedTransaction,
  getFeeAmount,
  getFeeAmountSimple,
  getSuitableUtxos,
  placeholderPrivateKeyBin,
} from "../transaction/Wif.js";
import { checkUtxos } from "../util/checkUtxos.js";
import {
  asSendRequestObject,
  getRuntimePlatform,
  sumTokenAmounts,
  sumUtxoValue,
  toTokenaddr,
} from "../util/index.js";
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
import { SignedMessage } from "../message/signed.js";

export const placeholderCashAddr =
  "bitcoincash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqfnhks603";
export const placeholderTokenAddr =
  "bitcoincash:zqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqweyg7usz";

/**
 * A class to hold features used by all wallets
 * @class  BaseWallet
 */
export class BaseWallet implements WalletI {
  public static StorageProvider?: typeof StorageProvider;

  readonly walletCache?: WalletCache;
  readonly provider: ElectrumNetworkProvider;
  readonly network: NetworkType;
  readonly walletType: WalletTypeEnum;
  _slpSemiAware: boolean = false; // a flag which requires an utxo to have more than 546 sats to be spendable and counted in the balance
  // readonly publicKeyHash!: Uint8Array;
  // readonly cashaddr!: string;
  // readonly tokenaddr!: string;
  readonly isTestnet: boolean;
  name: string = "";
  _util?: Util;
  protected cancelFns: CancelFn[] = [];

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
    throw Error("getInfo not implemented in BaseWallet");
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
    // return this.cashaddr;
    throw Error("getDepositAddress not implemented in BaseWallet");
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
    // return this.cashaddr;
    throw Error("getChangeAddress not implemented in BaseWallet");
  }

  /**
   * getTokenDepositAddress - get a cashtoken aware wallet deposit address
   *
   * @returns The cashtoken aware deposit address as a string
   */
  public getTokenDepositAddress(): string {
    // return this.tokenaddr;
    throw Error("getTokenDepositAddress not implemented in BaseWallet");
  }

  /**
   * getTokenDepositAddress - get a cashtoken aware wallet deposit address
   *
   * @returns The cashtoken aware deposit address as a string
   */
  public getTokenChangeAddress(): string {
    // return this.tokenaddr;
    throw Error("getTokenDepositAddress not implemented in BaseWallet");
  }

  // check if a given address belongs to this wallet
  public hasAddress(address: string): boolean {
    return (
      address === this.getDepositAddress() ||
      address === this.getChangeAddress()
    );
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
        const wallet = await this.initialize();
        wallet.name = name;
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

  protected async initialize(): Promise<this> {
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

  protected fromId(walletId: string): Promise<this> {
    throw Error("fromId not implemented in BaseWallet");
  }

  //#region Funds
  /**
   * utxos Get unspent outputs for the wallet
   *
   */
  public async getUtxos(): Promise<Utxo[]> {
    throw Error("getUtxos not implemented in BaseWallet");
  }

  // Gets balance by summing value in all utxos in sats
  // Balance includes DUST utxos which could be slp tokens and also cashtokens with BCH amounts
  public async getBalance(): Promise<bigint> {
    throw Error("getBalance not implemented in BaseWallet");
  }

  /**
   * Track a cancel function so it can be cancelled by stop()
   * Returns a wrapped cancel function that also removes itself from tracking
   */
  protected trackCancelFn(cancelFn: CancelFn): CancelFn {
    this.cancelFns.push(cancelFn);
    return async () => {
      const index = this.cancelFns.indexOf(cancelFn);
      if (index !== -1) {
        this.cancelFns.splice(index, 1);
      }
      await cancelFn();
    };
  }

  /**
   * Stop all active subscriptions on this wallet
   */
  public async stop(): Promise<void> {
    const fns = this.cancelFns.splice(0);
    await Promise.all(fns.map((fn) => fn()));
  }

  /**
   * Watch wallet for any activity (status changes)
   * This is the foundation for watchWalletBalance and watchWalletTransactions
   * @param callback - Called when  the wallet has a status change
   * @returns Cancel function to stop watching
   */
  public async watchStatus(
    callback: (status: string | null, address: string) => void
  ): Promise<CancelFn> {
    const cancelFn = await this.provider.watchAddressStatus(
      this.getDepositAddress(),
      (status) => callback(status, this.getDepositAddress())
    );
    return this.trackCancelFn(cancelFn);
  }

  // sets up a callback to be called upon wallet's balance change
  // can be cancelled by calling the function returned from this one
  public async watchBalance(
    callback: (balance: bigint) => void
  ): Promise<CancelFn> {
    return this.watchStatus(async () => {
      const balance = await this.getBalance();
      callback(balance);
    });
  }

  // waits for address balance to be greater than or equal to the target value
  // this call halts the execution
  public async waitForBalance(value: bigint): Promise<bigint> {
    return new Promise(async (resolve) => {
      let watchCancel: CancelFn;
      watchCancel = await this.watchBalance(async (balance: bigint) => {
        if (balance >= value) {
          await watchCancel?.();
          resolve(balance);
        }
      });
    });
  }

  // sets up a callback to be called upon wallet's token balance change
  // can be cancelled by calling the function returned from this one
  public async watchTokenBalance(
    category: string,
    callback: (balance: bigint) => void
  ): Promise<CancelFn> {
    return await this.watchStatus(async () => {
      const balance = await this.getTokenBalance(category);
      callback(balance);
    });
  }

  // waits for address token balance to be greater than or equal to the target amount
  // this call halts the execution
  public async waitForTokenBalance(
    category: string,
    amount: bigint
  ): Promise<bigint> {
    return new Promise(async (resolve) => {
      let watchCancel: CancelFn;
      watchCancel = await this.watchTokenBalance(
        category,
        async (balance: bigint) => {
          if (balance >= amount) {
            await watchCancel?.();
            resolve(balance);
          }
        }
      );
    });
  }

  /**
   * Watch wallet for new transactions
   * @param callback - Called with new transaction hashes when they appear
   * @returns Cancel function to stop watching
   */
  public async watchTransactionHashes(
    callback: (txHash: string) => void
  ): Promise<CancelFn> {
    const seenTxHashes = new Set<string>();

    let topHeight = 0;

    return this.watchStatus(async () => {
      const history = (await this.getRawHistory(topHeight)).sort((a, b) =>
        a.height <= 0 || b.height <= 0 ? -1 : b.height - a.height
      );

      const newTxHashes: string[] = [];

      for (const tx of history) {
        if (tx.height > topHeight) {
          topHeight = tx.height;
        }

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

  /**
   * Watch wallet for new transactions
   * @param callback - Called with new transaction hashes when they appear
   * @returns Cancel function to stop watching
   */
  public async watchTransactions(
    callback: (transaction: ElectrumRawTransaction) => void
  ): Promise<CancelFn> {
    return this.watchTransactionHashes(async (txHash: string) => {
      const tx = await this.provider.getRawTransactionObject(txHash);
      callback(tx);
    });
  }

  public async watchTokenTransactions(
    callback: (tx: ElectrumRawTransaction) => void
  ): Promise<CancelFn> {
    return this.watchTransactions(
      async (transaction: ElectrumRawTransaction) => {
        if (transaction.vout.some((val) => val.tokenData)) {
          callback(transaction);
        }
      }
    );
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
  ): Promise<{ value: bigint; utxos: Utxo[] }> {
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
    let utxos: Utxo[];
    const allUtxos = await this.getUtxos();
    if (params.options && params.options.utxoIds) {
      utxos = checkUtxos(
        params.options.utxoIds.map((utxoId: Utxo | string) =>
          typeof utxoId === "string" ? fromUtxoId(utxoId) : utxoId
        ),
        allUtxos
      );
    } else {
      utxos = allUtxos.filter((utxo) => !utxo.token);
    }

    // Get current height to assure recently mined coins are not spent.
    const bestHeight = await this.provider.getBlockHeight();

    // simulate outputs using the sender's address
    const sendRequest = new SendRequest({
      cashaddr: placeholderCashAddr,
      value: 100n,
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
      sourceAddress: placeholderCashAddr,
      relayFeePerByteInSatoshi: relayFeePerByteInSatoshi,
      feePaidBy: feePaidBy,
    });
    const spendableAmount = sumUtxoValue(fundingUtxos);

    let result = spendableAmount - fee;
    if (result < 0n) {
      result = 0n;
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
  ): Promise<bigint> {
    const { value: result } = await this._getMaxAmountToSend(params);

    return result;
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
    const { encodedTransaction, categories, sourceOutputs } =
      await this.encodeTransaction(requests, undefined, options);

    const resp = new SendResponse({});
    resp.categories = categories;

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
        resp.balance = await this.getBalance();
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
    });

    const { encodedTransaction, categories, sourceOutputs } =
      await this.encodeTransaction([sendRequest], true, options, privateKey);

    const resp = new SendResponse({});
    resp.categories = categories;

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
        resp.balance = await this.getBalance();
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

    if (options && options.slpSemiAware) {
      this._slpSemiAware = true;
    }

    let feePaidBy: FeePaidByEnum;
    if (options?.feePaidBy) {
      feePaidBy = options.feePaidBy;
    } else {
      feePaidBy = FeePaidByEnum.change;
    }

    let changeAddress: string;
    if (options?.changeAddress) {
      changeAddress = options.changeAddress;
    } else {
      changeAddress = this.getChangeAddress();
    }

    let checkTokenQuantities: boolean = true;
    if (options?.checkTokenQuantities === false) {
      checkTokenQuantities = false;
    }

    // get inputs from options or query all inputs
    let utxos: Utxo[] = await this.getUtxos();
    if (options && options.utxoIds) {
      utxos = checkUtxos(
        options.utxoIds.map((utxoId: Utxo | string) =>
          typeof utxoId === "string" ? fromUtxoId(utxoId) : utxoId
        ),
        utxos
      );
    }

    // filter out token utxos if there are no token requests
    if (
      checkTokenQuantities &&
      !sendRequests.some((val) => val instanceof TokenSendRequest)
    ) {
      utxos = utxos.filter((val) => !val.token);
    }

    const addTokenChangeOutputs = (
      inputs: Utxo[],
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
      const categories = allTokenOutputs
        .map((val) => val.category)
        .filter((val, idx, arr) => arr.indexOf(val) === idx);
      for (let category of categories) {
        const tokenInputs = allTokenInputs.filter(
          (val) => val.token?.category === category
        );
        const inputAmountSum = tokenInputs.reduce(
          (prev, cur) => prev + cur.token!.amount,
          0n
        );
        const tokenOutputs = allTokenOutputs.filter(
          (val) => val.category === category
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
          const ensureUtxos: Utxo[] = [];
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
                cashaddr: toTokenaddr(this.getChangeAddress()),
                amount: change,
                category: category,
                nft: tokenOutputs[0].nft,
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
      sourceAddress: this.getDepositAddress(),
      relayFeePerByteInSatoshi: relayFeePerByteInSatoshi,
      feePaidBy: feePaidBy,
    });

    const fundingUtxos = await getSuitableUtxos(
      utxos,
      spendAmount + feeEstimate,
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
      sourceAddress: this.getDepositAddress(),
      relayFeePerByteInSatoshi: relayFeePerByteInSatoshi,
      feePaidBy: feePaidBy,
      walletCache: this.walletCache,
    });
    const { encodedTransaction, sourceOutputs } = await buildEncodedTransaction(
      {
        inputs: fundingUtxos,
        outputs: sendRequests,
        signingKey: privateKey ?? placeholderPrivateKeyBin,
        fee,
        discardChange,
        feePaidBy,
        changeAddress,
        buildUnsigned: options?.buildUnsigned === true,
        walletCache: this.walletCache,
      }
    );

    const categories = [
      ...fundingUtxos
        .filter((val) => val.token?.category)
        .map((val) => val.token!.category),
      ...sendRequests
        .filter((val) => val instanceof TokenSendRequest)
        .map((val) => (val as TokenSendRequest).category),
    ].filter((value, index, array) => array.indexOf(value) === index);

    return { encodedTransaction, categories, sourceOutputs };
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
    throw Error("getRawHistory not implemented in BaseWallet");
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
      watchCancel = await this.watchStatus(async (_status) => {
        if (initialResponseSeen) {
          await watchCancel?.();
          resolve(makeResponse());
          return;
        }

        initialResponseSeen = true;
      });
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

    let utxos: Utxo[] = await this.getUtxos();
    if (options?.utxoIds) {
      utxos = checkUtxos(
        options.utxoIds.map((utxoId: UtxoId | string) =>
          typeof utxoId === "string" ? fromUtxoId(utxoId) : utxoId
        ),
        utxos
      );
    }

    const genesisInputs = utxos.filter((val) => val.vout === 0 && !val.token);
    if (genesisInputs.length === 0) {
      throw new Error(
        "No suitable inputs with vout=0 available for new token genesis"
      );
    }

    const genesisSendRequest = new TokenSendRequest({
      cashaddr: genesisRequest.cashaddr || this.getTokenDepositAddress(),
      amount: genesisRequest.amount,
      value: genesisRequest.value || 1000n,
      nft: genesisRequest.nft,
      category: genesisInputs[0].txid,
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
   * @param  {string} category category of an NFT to mint
   * @param  {TokenMintRequest | TokenMintRequest[]} mintRequests mint requests with new token properties and recipients
   * @param  {NFTCapability?} mintRequest.capability capability of new NFT
   * @param  {string?} mintRequest.commitment NFT commitment message
   * @param  {string?} mintRequest.cashaddr cash address to send the created token UTXO to; if undefined will default to your address
   * @param  {number?} mintRequest.value satoshi value to send alongside with tokens; if undefined will default to 1000 satoshi
   * @param  {boolean?} deductTokenAmount if minting token contains fungible amount, deduct from it by amount of minted tokens
   * @param  {SendRequestOptionsI} options Options of the send requests
   */
  public async tokenMint(
    category: string,
    mintRequests: TokenMintRequest | Array<TokenMintRequest>,
    deductTokenAmount: boolean = false,
    options?: SendRequestOptionsI
  ): Promise<SendResponse> {
    if (category?.length !== 64) {
      throw Error(`Invalid category supplied: ${category}`);
    }

    if (!Array.isArray(mintRequests)) {
      mintRequests = [mintRequests];
    }

    const utxos = await this.getUtxos();
    const nftUtxos = utxos.filter(
      (val) =>
        val.token?.category === category &&
        val.token?.nft?.capability === NFTCapability.minting
    );
    if (!nftUtxos.length) {
      throw new Error(
        "You do not have any token UTXOs with minting capability for specified category"
      );
    }
    const newAmount =
      deductTokenAmount && nftUtxos[0].token!.amount > 0
        ? nftUtxos[0].token!.amount - BigInt(mintRequests.length)
        : nftUtxos[0].token!.amount;
    const safeNewAmount = newAmount < 0n ? 0n : newAmount;
    const mintingInput = new TokenSendRequest({
      cashaddr: toTokenaddr(nftUtxos[0].address),
      category: category,
      nft: nftUtxos[0].token?.nft,
      amount: safeNewAmount,
      value: nftUtxos[0].satoshis,
    });
    return this.send(
      [
        mintingInput,
        ...mintRequests.map(
          (val) =>
            new TokenSendRequest({
              cashaddr: val.cashaddr || this.getTokenDepositAddress(),
              amount: 0n,
              category: category,
              value: val.value,
              nft: val.nft,
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
   * @param  {string} burnRequest.category category of a token to burn
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
    if (burnRequest.category?.length !== 64) {
      throw Error(`Invalid category supplied: ${burnRequest.category}`);
    }

    const utxos = await this.getUtxos();
    const tokenUtxos = utxos.filter(
      (val) =>
        val.token?.category === burnRequest.category &&
        val.token?.nft?.capability === burnRequest.nft?.capability &&
        val.token?.nft?.commitment === burnRequest.nft?.commitment
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
    const hasNFT = burnRequest.nft !== undefined;

    let utxoIds: Utxo[] = [];
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
            cashaddr:
              burnRequest.cashaddr || toTokenaddr(this.getChangeAddress()),
            category: burnRequest.category,
            nft: burnRequest.nft,
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
            cashaddr:
              burnRequest.cashaddr || toTokenaddr(this.getChangeAddress()),
            category: burnRequest.category,
            amount: safeNewAmount,
            value: tokenUtxos.reduce((a, c) => a + c.satoshis, 0n),
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
   * will return utxos only for the specified token if `category` provided
   * @param  {string?} category category to filter utxos by, if not set will return utxos from all tokens
   * @returns  {Utxo[]} token utxos
   */
  public async getTokenUtxos(category?: string): Promise<Utxo[]> {
    const utxos = await this.getUtxos();
    return utxos.filter((val) =>
      category ? val.token?.category === category : val.token
    );
  }

  /**
   * getTokenBalance Gets fungible token balance
   * for NFT token balance see @ref getNftTokenBalance
   * @param  {string} category category to get balance for
   * @returns  {bigint} fungible token balance
   */
  public async getTokenBalance(category: string): Promise<bigint> {
    const utxos = (await this.getTokenUtxos(category)).filter(
      (val) => val.token?.amount
    );
    return sumTokenAmounts(utxos, category);
  }

  /**
   * getNftTokenBalance Gets non-fungible token (NFT) balance for a particular category
   * disregards fungible token balances
   * for fungible token balance see @ref getTokenBalance
   * @param  {string} category category to get balance for
   * @returns  {number} non-fungible token balance
   */
  public async getNftTokenBalance(category: string): Promise<number> {
    const utxos = (await this.getTokenUtxos(category)).filter(
      (val) => val.token?.nft?.commitment !== undefined
    );
    return utxos.length;
  }

  /**
   * getAllTokenBalances Gets all fungible token balances in this wallet
   * @returns  {Object} a map [category => balance] for all tokens in this wallet
   */
  public async getAllTokenBalances(): Promise<{ [category: string]: bigint }> {
    const result = {};
    const utxos = (await this.getTokenUtxos()).filter(
      (val) => val.token?.amount
    );
    for (const utxo of utxos) {
      if (!result[utxo.token!.category]) {
        result[utxo.token!.category] = 0n;
      }
      result[utxo.token!.category] += utxo.token!.amount;
    }
    return result;
  }

  /**
   * getAllNftTokenBalances Gets all non-fungible token (NFT) balances in this wallet
   * @returns  {Object} a map [category => balance] for all NFTs in this wallet
   */
  public async getAllNftTokenBalances(): Promise<{
    [category: string]: number;
  }> {
    const result = {};
    const utxos = (await this.getTokenUtxos()).filter(
      (val) => val.token?.nft?.commitment !== undefined
    );
    for (const utxo of utxos) {
      if (!result[utxo.token!.category]) {
        result[utxo.token!.category] = 0;
      }
      result[utxo.token!.category] += 1;
    }
    return result;
  }
  //#endregion Cashtokens

  public sign(
    message: string,
    privateKey: Uint8Array | undefined = undefined
  ): SignedMessageResponseI {
    if (!privateKey) {
      throw new Error("Signing private key not provided");
    }
    return new SignedMessage().sign(message, privateKey);
  }

  // Convenience wrapper to verify interface
  public verify(
    message: string,
    sig: string,
    address?: string,
    publicKey?: Uint8Array
  ): VerifyMessageResponseI {
    if (!address && !publicKey) {
      throw new Error(
        "Either address or publicKey must be provided for verification"
      );
    }

    return new SignedMessage().verify(message, sig, address, publicKey);
  }
}

/**
 * _checkContextSafety (internal) if running in nodejs, will disable saving
 * mainnet wallets on public servers if ALLOW_MAINNET_USER_WALLETS is set to false
 * @param {BaseWallet} wallet        a wallet
 */
export const _checkContextSafety = function (wallet: BaseWallet) {
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

export function getStorageProvider(
  dbName: string
): StorageProvider | undefined {
  if (!BaseWallet.StorageProvider) {
    return undefined;
  }
  return new (BaseWallet.StorageProvider as any)(dbName);
}
