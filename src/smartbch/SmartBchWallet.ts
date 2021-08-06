import "../util/randomValues";

import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { NetworkType } from "../enum";
import { ethers, utils } from "ethers";
import { WalletTypeEnum } from "../wallet/enum";
import { SendRequest, SendRequestArray, SendResponse } from "../wallet/model";
import { SendRequestOptionsI } from "../wallet/interface";
import { balanceFromSatoshi, BalanceResponse, balanceResponseFromSatoshi } from "../util/balanceObjectFromSatoshi";
import { sanitizeUnit } from "../util/sanitizeUnit";
import { BaseWallet } from "../wallet/Base";
import { amountInSatoshi } from "../util/amountInSatoshi";
import { Erc20 } from "./Erc20";

export class SmartBchWallet extends BaseWallet {
  provider?: ethers.providers.BaseProvider;
  ethersWallet?: ethers.Wallet;
  privateKey?: string;
  publicKey?: string;
  mnemonic?: string;
  derivationPath: string = "m/44'/60'/0'/0/0";
  _erc20?: Erc20;

  /**
   * constructor for a new wallet
   * @param {string} name              name of the wallet
   * @param networkPrefix              network for wallet
   *
   * @throws {Error} if called on BaseWallet
   */
   constructor(name = "", networkType = NetworkType.Mainnet, walletType = WalletTypeEnum.Seed
   ) {
    super(name, networkType, walletType);
  }

  public getNetworkProvider(network: NetworkType = NetworkType.Mainnet): ethers.providers.BaseProvider {
    switch (network) {
      case NetworkType.Mainnet: {
        return new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161");
      }
      case NetworkType.Testnet: {
        return new ethers.providers.JsonRpcProvider("http://35.220.203.194:8545", { name: "smartbch", chainId: 10001 });
      }
      default: {
        return new ethers.providers.JsonRpcProvider("http://localhost:8545");
      }
    }
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

  public async fromPrivateKey(secret: string): Promise<this> {
    this.ethersWallet = new ethers.Wallet(secret).connect(this.provider!);
    this.walletType = WalletTypeEnum.PrivateKey;
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
    this.walletType = WalletTypeEnum.Seed;
    await this.deriveInfo();
    return this;
  }

  private async deriveInfo() {
    this.publicKey = this.ethersWallet!.publicKey;
    this.privateKey = this.ethersWallet!.privateKey;
    this.address = this.ethersWallet!.address;
    return this;
  }

  // Initialize a watch only wallet from a cash addr
  public async watchOnly(address: string): Promise<this> {
    this.address = address;
    this.ethersWallet = undefined;
    this.privateKey = undefined;
    this.walletType = WalletTypeEnum.Watch;

    return this;
  }

  public async generate(): Promise<this> {
    if (this.walletType === WalletTypeEnum.PrivateKey) {
      return await this._generatePrivateKey();
    } else {
      return await this._generateMnemonic();
    }
  }

  private async _generatePrivateKey() {
    if (!this.privateKey) {
      this.ethersWallet = ethers.Wallet.createRandom().connect(this.provider!);
    }
    this.walletType = WalletTypeEnum.PrivateKey;
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

  public _fromId = async (walletId: string): Promise<this> => {
    let [walletType, networkGiven, arg1]: string[] = walletId.split(":");

    if (this.network != networkGiven) {
      throw Error(
        `Network prefix ${networkGiven} to a ${
          this.network
        } wallet`
      );
    }

    // "privkey:regtest:0x89b83ea27318a8c46c229f5b85c34975115ebc3b62e5e662e3cb6f96b77c8100"
    if (walletType === "privkey") {
      return this.fromPrivateKey(arg1);
    }

    return super._fromId(walletId);
  };


  /**
   * fromPrivateKey - create a wallet using the private key supplied in `Wallet Import Format`
   *
   * @param privateKey   encoded private key string
   *
   * @returns instantiated wallet
   */
  public static async fromPrivateKey(privateKey: string): Promise<SmartBchWallet> {
    return new this().fromPrivateKey(privateKey);
  }

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
    return (await (this.provider! as ethers.providers.BaseProvider).getBalance(this.address!)).div(10**10).toNumber();
  }
}

/**
 * Class to manage a testnet wallet.
 */
 export class TestNetSmartBchWallet extends SmartBchWallet {
  constructor(name = "") {
    super(name, NetworkType.Testnet);
  }
}

/**
 * Class to manage a regtest wallet.
 */
 export class RegTestSmartBchWallet extends SmartBchWallet {
  constructor(name = "") {
    super(name, NetworkType.Regtest);
  }
}