import "../util/randomValues";

import { NetworkType, UnitEnum } from "../enum";
import { ethers } from "ethers";
import { WalletTypeEnum } from "../wallet/enum";
import {
  SendRequest,
  SendRequestArray,
  SendResponse,
  BalanceResponse,
  CancelWatchFn,
  WaitForTransactionOptions,
  WaitForTransactionResponse,
  Sep20SendResponse,
} from "./interface";
import { SendRequestOptionsI } from "./interface";
import {
  balanceFromSatoshi,
  balanceResponseFromSatoshi,
} from "../util/balanceObjectFromSatoshi";
import { sanitizeUnit } from "../util/sanitizeUnit";
import { BaseWallet } from "../wallet/Base";
import { amountInSatoshi } from "../util/amountInSatoshi";
import {
  Sep20,
  RegTestSep20,
  RegTestPrivKeySep20,
  RegTestWatchSep20,
  TestNetSep20,
  TestNetPrivKeySep20,
  TestNetWatchSep20,
  WatchSep20,
  Web3Sep20,
} from "./Sep20";
import { SignedMessageResponseI, VerifyMessageResponseI } from "../message";
import { getNetworkProvider } from "./Network";
import {
  asSendRequestObject,
  satToWei,
  waitForBlock,
  watchAddress,
  watchAddressTransactions,
  watchBlocks,
  weiToSat,
  zeroAddress,
} from "./Utils";

import axios from "axios";

export class SmartBchWallet extends BaseWallet {
  provider?: ethers.providers.BaseProvider;
  ethersWallet?: ethers.Wallet;
  ethersSigner?: ethers.Signer;
  privateKey?: string;
  publicKey?: string;
  mnemonic?: string;
  derivationPath: string = "m/44'/60'/0'/0/0";
  _sep20?: Sep20;

  //#region Accessors
  // interface to sep20 functions. see Sep20.ts
  public get sep20() {
    if (!this._sep20) {
      this._sep20 = new Sep20(this);
    }

    return this._sep20;
  }

  // interface to sep20 functions. see Sep20.ts
  public static get sep20() {
    return Sep20;
  }

  /**
   *  getNetworkProvider   get a default network provider for a given network
   *
   * @param network provider's network
   */
  protected getNetworkProvider(
    network: NetworkType = NetworkType.Mainnet
  ): ethers.providers.BaseProvider {
    return getNetworkProvider(network);
  }

  /**
   *  setNetworkProvider   Change wallet's provider
   *
   * @param provider network provider initialized elsewhere
   */
  public setNetworkProvider(provider: ethers.providers.BaseProvider) {
    this.provider = provider;
    if (this.ethersWallet) {
      this.ethersWallet.connect(this.provider);
    }
    if (this.ethersSigner) {
      this.ethersSigner.connect(this.provider);
    }
  }

  /**
   *  setNetwork   Change wallet's and provider's network
   */
  public setNetwork(network: NetworkType = NetworkType.Mainnet) {
    this.network = network;
    this.setNetworkProvider(getNetworkProvider(network));
  }

  /**
   *  useBrowserWeb3Provider   Modifies the wallet behaviour to function with a Web3 provider such as Metamask
   *
   * @param addressOrIndex   Account address or account index to use
   */
  public async useBrowserWeb3Provider(
    addressOrIndex: number | string | undefined
  ) {
    const ethereum = ((window as any) || {}).ethereum;
    if (ethereum) {
      await ethereum.enable();
      const provider = new ethers.providers.Web3Provider(
        (window as any).ethereum
      );
      this.ethersWallet = undefined;
      this.privateKey = undefined;
      this.publicKey = undefined;
      this.ethersSigner = provider.getSigner(addressOrIndex);
      this.address = await this.ethersSigner!.getAddress();
      this.provider = provider;
    }
  }

  /**
   *  explorerUrl   Web url to a transaction on a block explorer
   *
   * @param txId   transaction Id
   * @returns   Url string
   */
  public explorerUrl(txId: string) {
    const explorerUrlMap = {
      mainnet: "https://www.smartscan.cash/transaction/",
      testnet: "",
      regtest: "",
    };

    return explorerUrlMap[this.network] + txId;
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
    name = "",
    network = NetworkType.Mainnet,
    walletType = WalletTypeEnum.Seed
  ) {
    super(name, network, walletType);
  }
  /**
   * fromPrivateKey - create a wallet using the private key supplied in `Wallet Import Format`
   *
   * @param privateKey   encoded private key string
   *
   * @returns instantiated wallet
   */
  public static async fromPrivateKey<T extends typeof SmartBchWallet>(
    this: T,
    privateKey: string
  ): Promise<InstanceType<T>> {
    return new this().fromPrivateKey(privateKey) as InstanceType<T>;
  }
  //#endregion Constructors and Statics

  //#region Protected implementations
  protected async generate(): Promise<this> {
    if (this.walletType === WalletTypeEnum.PrivateKey) {
      return await this._generatePrivateKey();
    } else {
      return await this._generateMnemonic();
    }
  }

  private async _generatePrivateKey() {
    if (!this.privateKey) {
      this.ethersWallet = ethers.Wallet.createRandom().connect(this.provider!);
      this.ethersSigner = this.ethersWallet;
    }
    this.walletType = WalletTypeEnum.PrivateKey;
    return this.deriveInfo();
  }

  private async _generateMnemonic() {
    if (!this.mnemonic) {
      this.ethersWallet = ethers.Wallet.createRandom().connect(this.provider!);
      this.ethersSigner = this.ethersWallet;
      this.mnemonic = this.ethersWallet.mnemonic.phrase;
      this.derivationPath = this.ethersWallet.mnemonic.path;
    }
    this.walletType = WalletTypeEnum.Seed;
    return await this.deriveInfo();
  }

  protected fromId = async (walletId: string): Promise<this> => {
    let [walletType, networkGiven, arg1]: string[] = walletId.split(":");

    if (this.network != networkGiven) {
      throw Error(`Network prefix ${networkGiven} to a ${this.network} wallet`);
    }

    // "privkey:regtest:0x89b83ea27318a8c46c229f5b85c34975115ebc3b62e5e662e3cb6f96b77c8100"
    if (walletType === "privkey") {
      return this.fromPrivateKey(arg1);
    }

    return super.fromId(walletId);
  };

  // Initialize wallet from a mnemonic phrase
  protected async fromSeed(
    mnemonic: string,
    derivationPath?: string
  ): Promise<this> {
    this.mnemonic = mnemonic;

    if (derivationPath) {
      this.derivationPath = derivationPath;
    }

    this.ethersWallet = ethers.Wallet.fromMnemonic(
      this.mnemonic,
      this.derivationPath
    ).connect(this.provider!);
    this.ethersSigner = this.ethersWallet;
    this.walletType = WalletTypeEnum.Seed;
    await this.deriveInfo();
    return this;
  }

  // Initialize a watch only wallet from a cash addr
  protected async watchOnly(address: string): Promise<this> {
    this.address = address;
    this.ethersWallet = undefined;
    this.ethersSigner = undefined;
    this.privateKey = undefined;
    this.walletType = WalletTypeEnum.Watch;

    return this;
  }

  public async fromPrivateKey(secret: string): Promise<this> {
    this.ethersWallet = new ethers.Wallet(secret).connect(this.provider!);
    this.ethersSigner = this.ethersWallet;
    this.walletType = WalletTypeEnum.PrivateKey;
    await this.deriveInfo();
    return this;
  }
  //#endregion Protected implementations

  //#region Serialization
  // Returns the serialized wallet as a string
  // If storing in a database, set asNamed to false to store secrets
  // In all other cases, the a named wallet is deserialized from the database
  //  by the name key
  public toString() {
    const result = super.toString();
    if (result) return result;

    if (this.walletType === WalletTypeEnum.PrivateKey) {
      return `${this.walletType}:${this.network}:${this.privateKey}`;
    }

    throw Error("toString unsupported wallet type");
  }

  //
  public toDbString() {
    const result = super.toDbString();
    if (result) return result;

    if (this.walletType === WalletTypeEnum.PrivateKey) {
      return `${this.walletType}:${this.network}:${this.privateKey}`;
    }

    throw Error("toDbString unsupported wallet type");
  }
  //#endregion Serialization

  //#region Funds
  // gets wallet balance in sats, bch and usd
  public async getBalance(
    rawUnit?: string,
    usdPriceCache = true
  ): Promise<BalanceResponse | number> {
    if (rawUnit) {
      const unit = sanitizeUnit(rawUnit);
      return await balanceFromSatoshi(
        await this.getBalanceFromProvider(),
        unit,
        usdPriceCache
      );
    } else {
      return await balanceResponseFromSatoshi(
        await this.getBalanceFromProvider(),
        usdPriceCache
      );
    }
  }

  public async getBalanceFromProvider(): Promise<number> {
    return (await this.provider!.getBalance(this.address!))
      .div(10 ** 10)
      .toNumber();
  }

  public async getMaxAmountToSend(
    _params?: any,
    overrides: ethers.CallOverrides = {}
  ): Promise<BalanceResponse> {
    const gas = await this.provider!.estimateGas({
      from: this.getDepositAddress(),
      to: zeroAddress(),
      value: 0,
      ...overrides,
    });

    const gasPrice = ethers.BigNumber.from(
      overrides.gasPrice! || (await this.provider!.getGasPrice())
    );
    const balance = await this.provider!.getBalance(this.address!);

    return await balanceResponseFromSatoshi(
      weiToSat(balance.sub(gas.mul(gasPrice)))
    );
  }

  /**
   * send Send some amount to an address
   *
   * This is a first class function with REST analog, maintainers should strive to keep backward-compatibility
   *
   */
  public async send(
    requests: SendRequest | Array<SendRequest> | SendRequestArray[],
    options?: SendRequestOptionsI,
    overrides: ethers.CallOverrides = {}
  ): Promise<SendResponse[]> {
    let sendRequests = asSendRequestObject(requests);

    const responses: SendResponse[] = [];
    for (const request of sendRequests) {
      const weiValue = ethers.BigNumber.from(
        await amountInSatoshi(request.value, request.unit)
      ).mul(10 ** 10);

      const result = await this.ethersSigner!.sendTransaction({
        to: request.address,
        value: weiValue,
        ...overrides,
      });

      const awaitTransactionPropagation =
        !options ||
        options.awaitTransactionPropagation === undefined ||
        options.awaitTransactionPropagation;

      if (awaitTransactionPropagation) {
        await result.wait();
      }

      const resp = <SendResponse>{ txId: result.hash };
      const queryBalance =
        !options || options.queryBalance === undefined || options.queryBalance;
      if (queryBalance) {
        resp.balance = (await this.getBalance()) as BalanceResponse;
      }

      resp.explorerUrl = this.explorerUrl(resp.txId!);
      responses.push(resp);
    }

    return responses;
  }

  public async sendMax(
    address: string,
    options?: any,
    overrides: ethers.CallOverrides = {}
  ): Promise<SendResponse> {
    const maxAmount = await this.getMaxAmountToSend({}, overrides);
    return (
      await this.send(
        [{ address: address, value: maxAmount.sat!, unit: UnitEnum.SAT }],
        options,
        overrides
      )
    )[0];
  }

  // waiting for any transaction hash of this wallet
  public watchAddress(callback: (txHash: string) => void): CancelWatchFn {
    return watchAddress(this.provider!, this.getDepositAddress(), callback);
  }

  // waiting for any transaction of this wallet
  public watchAddressTransactions(
    callback: (tx: ethers.providers.TransactionResponse) => void
  ): CancelWatchFn {
    return watchAddressTransactions(
      this.provider!,
      this.getDepositAddress(),
      callback
    );
  }

  // sets up a callback to be called upon wallet's balance change
  // can be cancelled by calling the function returned from this one
  public watchBalance(
    callback: (balance: BalanceResponse) => void
  ): CancelWatchFn {
    const watchBalanceCallback = async () => {
      const balance = (await this.getBalance()) as BalanceResponse;
      await callback(balance);
    };
    return this.watchAddress(watchBalanceCallback);
  }

  // sets up a callback to be called upon wallet's BCH or USD balance change
  // if BCH balance does not change, the callback will be triggered every
  // @param `usdPriceRefreshInterval` milliseconds by polling for new BCH USD price
  // Since we want to be most sensitive to usd value change, we do not use the cached exchange rates
  // can be cancelled by calling the function returned from this one
  public watchBalanceUsd(
    callback: (balance: BalanceResponse) => void,
    usdPriceRefreshInterval = 30000
  ): CancelWatchFn {
    let usdPrice = -1;

    const _callback = async () => {
      const balance = (await this.getBalance(
        undefined,
        false
      )) as BalanceResponse;
      if (usdPrice !== balance.usd!) {
        usdPrice = balance.usd!;
        callback(balance);
      }
    };

    const watchCancel = this.watchAddress(_callback);
    const interval = setInterval(_callback, usdPriceRefreshInterval);

    return async () => {
      await watchCancel();
      clearInterval(interval);
    };
  }

  // waits for address balance to be greater than or equal to the target value
  // this call halts the execution
  public async waitForBalance(
    value: number,
    rawUnit: UnitEnum = UnitEnum.BCH
  ): Promise<BalanceResponse> {
    return new Promise((resolve) => {
      const watchCancel = this.watchBalance(
        async (balance: BalanceResponse) => {
          const satoshiBalance = await amountInSatoshi(value, rawUnit);
          if (balance.sat! >= satoshiBalance) {
            await watchCancel();
            resolve(balance);
          }
        }
      );
    });
  }

  // waits for next transaction, program execution is halted
  public async waitForTransaction(
    options: WaitForTransactionOptions = {
      confirmations: 1,
      getTransactionInfo: true,
      getBalance: false,
      txHash: undefined,
    }
  ): Promise<WaitForTransactionResponse> {
    if (options.confirmations === undefined) {
      options.confirmations = 1;
    }

    if (options.getTransactionInfo === undefined) {
      options.getTransactionInfo = true;
    }

    if (options.getBalance === undefined) {
      options.getBalance = false;
    }

    // tx hash is known, just wait for it
    if (options.txHash) {
      const result: WaitForTransactionResponse = {
        transactionInfo: await this.provider!.waitForTransaction(
          options.txHash!
        ),
      };
      if (options.getBalance!) {
        result.balance = (await this.getBalance()) as BalanceResponse;
      }

      return result;
    }

    // tx hash is unknown, let's wait for the first one
    // by listening for all pending transactions and filtering for our address
    return new Promise(async (resolve) => {
      const watchCancel = this.watchAddressTransactions(
        async (tx: ethers.providers.TransactionResponse) => {
          await watchCancel();
          resolve(
            await this.waitForTransaction({ ...options, txHash: tx.hash })
          );
        }
      );
    });
  }

  /**
   * watchBlocks Watch network blocks
   *
   * @param callback callback with a block object
   *
   * @returns a function which will cancel watching upon evaluation
   */
  public watchBlocks(
    callback: (block: ethers.providers.Block) => void
  ): CancelWatchFn {
    return watchBlocks(this.provider!, callback);
  }

  /**
   * waitForBlock Wait for a network block
   *
   * @param targetBlockNumber if specified waits for this exact blockchain height, otherwise resolves with the next block
   *
   */
  public async waitForBlock(
    targetBlockNumber?: number
  ): Promise<ethers.providers.Block> {
    return waitForBlock(this.provider!, targetBlockNumber);
  }
  //#endregion Funds

  //#region Private implementation details
  private async deriveInfo() {
    this.publicKey = this.ethersWallet!.publicKey;
    this.privateKey = this.ethersWallet!.privateKey;
    this.address = this.ethersWallet!.address;
    return this;
  }
  //#endregion Private implementation details

  //#region Signing
  // Convenience wrapper to sign interface
  public async sign(message: string): Promise<SignedMessageResponseI> {
    return {
      signature: await this.ethersSigner!.signMessage(message),
    } as SignedMessageResponseI;
  }

  // Convenience wrapper to verify interface
  public async verify(
    message: string,
    sig: string
  ): Promise<VerifyMessageResponseI> {
    const result = ethers.utils.verifyMessage(message, sig);
    return {
      valid: result === this.address!,
    } as VerifyMessageResponseI;
  }
  //#endregion Signing
}

/**
 * Class to manage a testnet wallet.
 */
export class Web3SmartBchWallet extends SmartBchWallet {
  public static async init(addressOrIndex: number | string | undefined) {
    const wallet = new Web3SmartBchWallet();
    await wallet.useBrowserWeb3Provider(addressOrIndex);
    return wallet;
  }

  public explorerUrl(txId: string) {
    return txId;
  }

  // interface to static sep20 functions. see Sep20.ts
  public static get sep20() {
    return Web3Sep20;
  }
}

/**
 * Class to manage a testnet wallet.
 */
export class TestNetSmartBchWallet extends SmartBchWallet {
  static faucetServer = "https://rest-unstable.mainnet.cash";
  constructor(name = "") {
    super(name, NetworkType.Testnet);
  }

  // will receive top-up to 0.1 testnet BCH, rate limits apply
  async getTestnetSatoshis(): Promise<string> {
    try {
      const response = await axios.post(
        `${TestNetSmartBchWallet.faucetServer}/faucet/get_testnet_sbch`,
        { address: this.getDepositAddress() }
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
        `${TestNetSmartBchWallet.faucetServer}/faucet/get_addresses`
      );
      const data = response.data;
      return await this.sendMax(data.sbchtest);
    } catch (e: any) {
      console.log(e);
      console.log(e.response ? e.response.data : "");
      throw e;
    }
  }

  // will receive 10 testnet tokens, rate limits apply
  async getTestnetSep20(tokenId: string): Promise<string> {
    try {
      const response = await axios.post(
        `${TestNetSmartBchWallet.faucetServer}/faucet/get_testnet_sep20`,
        { address: this.getDepositAddress(), tokenId: tokenId }
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
  async returnTestnetSep20(tokenId: string): Promise<Sep20SendResponse> {
    try {
      const response = await axios.post(
        `${TestNetSmartBchWallet.faucetServer}/faucet/get_addresses`
      );
      const data = response.data;
      return await this.sep20.sendMax(data.sep20test, tokenId);
    } catch (e: any) {
      console.log(e);
      console.log(e.response ? e.response.data : "");
      throw e;
    }
  }

  // interface to static sep20 functions. see Sep20.ts
  public static get sep20() {
    return TestNetSep20;
  }
}

/**
 * Class to manage a regtest wallet.
 */
export class RegTestSmartBchWallet extends SmartBchWallet {
  constructor(name = "") {
    super(name, NetworkType.Regtest);
  }

  // interface to static sep20 functions. see Sep20.ts
  public static get sep20() {
    return RegTestSep20;
  }
}

/**
 * Class to manage a mainnet privkey wallet.
 */
export class PrivKeySmartBchWallet extends SmartBchWallet {
  static walletType = WalletTypeEnum.PrivateKey;
  constructor(name = "") {
    super(name, NetworkType.Mainnet, WalletTypeEnum.PrivateKey);
  }

  // interface to static sep20 functions. see Sep20.ts
  public static get sep20() {
    return TestNetPrivKeySep20;
  }
}

/**
 * Class to manage a testnet privkey wallet.
 */
export class TestNetPrivKeySmartBchWallet extends SmartBchWallet {
  static walletType = WalletTypeEnum.PrivateKey;
  constructor(name = "") {
    super(name, NetworkType.Testnet, WalletTypeEnum.PrivateKey);
  }

  // interface to static sep20 functions. see Sep20.ts
  public static get sep20() {
    return TestNetPrivKeySep20;
  }
}

/**
 * Class to manage a regtest privkey wallet.
 */
export class RegTestPrivKeySmartBchWallet extends SmartBchWallet {
  static walletType = WalletTypeEnum.PrivateKey;
  constructor(name = "") {
    super(name, NetworkType.Regtest, WalletTypeEnum.PrivateKey);
  }

  // interface to static sep20 functions. see Sep20.ts
  public static get sep20() {
    return RegTestPrivKeySep20;
  }
}

/**
 * Class to manage a bitcoin cash watch wallet.
 */
export class WatchSmartBchWallet extends SmartBchWallet {
  static walletType = WalletTypeEnum.Watch;
  constructor(name = "") {
    super(name, NetworkType.Mainnet, WalletTypeEnum.Watch);
  }

  // interface to static sep20 functions. see Sep20.ts
  public static get sep20() {
    return WatchSep20;
  }
}

/**
 * Class to manage a testnet watch wallet.
 */
export class TestNetWatchSmartBchWallet extends SmartBchWallet {
  static walletType = WalletTypeEnum.Watch;
  constructor(name = "") {
    super(name, NetworkType.Testnet, WalletTypeEnum.Watch);
  }

  // interface to static sep20 functions. see Sep20.ts
  public static get sep20() {
    return TestNetWatchSep20;
  }
}

/**
 * Class to manage a regtest watch wallet.
 */
export class RegTestWatchSmartBchWallet extends SmartBchWallet {
  static walletType = WalletTypeEnum.Watch;
  constructor(name = "") {
    super(name, NetworkType.Regtest, WalletTypeEnum.Watch);
  }

  // interface to static sep20 functions. see Sep20.ts
  public static get sep20() {
    return RegTestWatchSep20;
  }
}
