// Stable
import { instantiateSecp256k1, instantiateSha256 } from "@bitauth/libauth";

// Unstable?
import {
  binToHex,
  CashAddressNetworkPrefix,
  decodePrivateKeyWif,
  encodePrivateKeyWif,
  generatePrivateKey,
} from "@bitauth/libauth";

import { UnitEnum, WalletTypeEnum } from "./enum";

import { BaseWallet } from "./Base";

import { PrivateKey } from "../interface";

import {
  SendMaxRequest,
  SendRequest,
  SendRequestArray,
  SendResponse,
  UtxoItem,
  UtxoResponse,
} from "./model";

import { Utxo } from "../interface";

import {
  buildEncodedTransaction,
  getSuitableUtxos,
  getFeeAmount,
} from "../transaction/Wif";

import { getStorageProvider } from "../db/util";
import { fromId, fromWif, named, watchOnly, newRandom } from "./createWallet";
import { qrAddress, Image } from "../qr/Qr";
import { asSendRequestObject } from "../util/asSendRequestObject";
import { checkWifNetwork } from "../util/checkWifNetwork";
import { deriveCashaddr } from "../util/deriveCashaddr";
import {
  balanceFromSatoshi,
  balanceResponseFromSatoshi,
  BalanceResponse,
} from "../util/balanceObjectFromSatoshi";
import { sumUtxoValue } from "../util/sumUtxoValue";
import { sumSendRequestAmounts } from "../util/sumSendRequestAmounts";

const secp256k1Promise = instantiateSecp256k1();
const sha256Promise = instantiateSha256();

export class WifWallet extends BaseWallet {
  publicKey?: Uint8Array;
  privateKey?: Uint8Array;
  uncompressedPrivateKey?: Uint8Array;
  privateKeyWif?: string;
  walletType?: WalletTypeEnum;
  cashaddr?: string;

  constructor(name = "", networkPrefix = CashAddressNetworkPrefix.mainnet) {
    super(name, networkPrefix);
    this.name = name;
    this.walletType = WalletTypeEnum.Wif;
  }

  // Initialize wallet from a cash addr
  public async initializeWatchOnly(address: string) {
    if (address.startsWith("bitcoincash:") && this.networkType === "testnet") {
      throw Error("a testnet address cannot be watched from a mainnet Wallet");
    } else if (
      !address.startsWith("bitcoincash:") &&
      this.networkType === "mainnet"
    ) {
      throw Error("a mainnet address cannot be watched from a testnet Wallet");
    }
    this.cashaddr = address;
  }

  // Initialize wallet from Wallet Import Format
  public async initializeWIF(
    walletImportFormatString: string
  ): Promise<void | Error> {
    const sha256 = await sha256Promise;
    const secp256k1 = await secp256k1Promise;
    let result = decodePrivateKeyWif(sha256, walletImportFormatString);

    const hasError = typeof result === "string";
    if (hasError) {
      throw Error(result as string);
    }
    checkWifNetwork(walletImportFormatString, this.networkType);
    let resultData: PrivateKey = result as PrivateKey;
    this.privateKey = resultData.privateKey;
    this.privateKeyWif = walletImportFormatString;
    this.walletType = WalletTypeEnum.Wif;
    this.publicKey = secp256k1.derivePublicKeyCompressed(this.privateKey);
    this.cashaddr = (await deriveCashaddr(
      this.privateKey,
      this.networkPrefix
    )) as string;
  }

  public async generateWif(): Promise<void | Error> {
    const sha256 = await sha256Promise;
    const secp256k1 = await secp256k1Promise;

    // nodejs
    if (typeof process !== "undefined") {
      let crypto = require("crypto");
      this.privateKey = generatePrivateKey(() => crypto.randomBytes(32));
    }
    // window, webworkers, service workers
    else {
      this.privateKey = generatePrivateKey(() =>
        window.crypto.getRandomValues(new Uint8Array(32))
      );
    }
    this.publicKey = secp256k1.derivePublicKeyCompressed(this.privateKey);
    this.privateKeyWif = encodePrivateKeyWif(
      sha256,
      this.privateKey,
      this.networkType
    );
    checkWifNetwork(this.privateKeyWif, this.networkType);
    this.walletType = WalletTypeEnum.Wif;
    this.cashaddr = (await deriveCashaddr(
      this.privateKey,
      this.networkPrefix
    )) as string;
  }

  public async send(
    requests: SendRequest[] | SendRequestArray[]
  ): Promise<SendResponse> {
    try {
      let sendRequests = asSendRequestObject(requests);
      let result = await this._processSendRequests(sendRequests);
      let resp = new SendResponse({});
      resp.txId = result;
      resp.balance = (await this.getBalance()) as BalanceResponse;
      return resp;
    } catch (e) {
      throw e;
    }
  }

  public async sendMax(sendMaxRequest: SendMaxRequest): Promise<SendResponse> {
    try {
      let result = await this.sendMaxRaw(sendMaxRequest);
      let resp = new SendResponse({});
      resp.txId = result;
      resp.balance = (await this.getBalance()) as BalanceResponse;
      return resp;
    } catch (e) {
      throw Error(e);
    }
  }

  public async sendMaxRaw(sendMaxRequest: SendMaxRequest) {
    let maxSpendableAmount = await this.getMaxAmountToSend({});
    if (maxSpendableAmount.sat === undefined) {
      throw Error("no Max amount to send");
    }
    let sendRequest = new SendRequest({
      cashaddr: sendMaxRequest.cashaddr,
      value: maxSpendableAmount.sat,
      unit: "sat",
    });
    return await this._processSendRequests([sendRequest], true);
  }

  public getSerializedWallet() {
    return `${this.walletType}:${this.network}:${this.privateKeyWif}`;
  }

  public getDepositAddress() {
    return this.cashaddr;
  }

  public getDepositQr(): Image {
    return qrAddress(this.cashaddr as string);
  }

  public async getAddressUtxos(address: string): Promise<Utxo[]> {
    if (!this.provider) {
      throw Error("Attempting to get utxos from wallet without a client");
    }
    const res = await this.provider.getUtxos(address);
    if (!res) {
      throw Error("No Utxo response from server");
    }
    return res;
  }

  public async getBalance(rawUnit?: string): Promise<BalanceResponse | number> {
    if (rawUnit) {
      const unit = rawUnit.toLocaleLowerCase() as UnitEnum;
      return await balanceFromSatoshi(await this.getBalanceFromUtxos(), unit);
    } else {
      return await balanceResponseFromSatoshi(await this.getBalanceFromUtxos());
    }
  }

  // Gets balance by summing value in all utxos in stats
  public async getBalanceFromUtxos(): Promise<number> {
    const utxos = await this.getAddressUtxos(this.cashaddr!);
    return await sumUtxoValue(utxos);
  }

  public toString() {
    return `${this.walletType}:${this.networkType}:${this.privateKeyWif}`;
  }

  public async getMaxAmountToSend({
    outputCount = 1,
  }: {
    outputCount?: number;
  }): Promise<BalanceResponse> {
    if (!this.privateKey) {
      throw Error("Couldn't get network or private key for wallet.");
    }
    if (!this.cashaddr) {
      throw Error("attempted to send without a cashaddr");
    }
    // get inputs
    let utxos = await this.getAddressUtxos(this.cashaddr);

    // Get current height to assure recently mined coins are not spent.
    let bestHeight = await this.provider!.getBlockHeight();
    if (!bestHeight) {
      throw Error("Couldn't get chain height");
    }

    // simulate outputs using the sender's address
    const sendRequest = new SendRequest({
      cashaddr: this.cashaddr,
      value: 100,
      unit: "sat",
    });
    let sendRequests = Array(outputCount)
      .fill(0)
      .map(() => sendRequest);

    let fundingUtxos = await getSuitableUtxos(utxos, undefined, bestHeight);
    let fee = await getFeeAmount({
      utxos: fundingUtxos,
      sendRequests: sendRequests,
      privateKey: this.privateKey,
    });
    let spendableAmount = await sumUtxoValue(fundingUtxos);

    return await balanceResponseFromSatoshi(spendableAmount - fee);
  }
  /**
   * utxos Get unspent outputs for the wallet
   */
  public async getUtxos() {
    if (!this.cashaddr) {
      throw Error("Attempted to get utxos without an address");
    }
    let utxos = await this.getAddressUtxos(this.cashaddr);
    let resp = new UtxoResponse();
    resp.utxos = await Promise.all(
      utxos.map(async (o: Utxo) => {
        let utxo = new UtxoItem();
        utxo.unit = "sat";
        utxo.value = o.satoshis;

        utxo.txId = o.txid;
        utxo.index = o.vout;
        utxo.utxoId = utxo.txId + ":" + utxo.index;
        return utxo;
      })
    );
    return resp;
  }

  /**
   * _processSendRequests given a list of sendRequests, estimate fees, build the transaction and submit it.
   * @param  {SendRequest[]} sendRequests
   * @param  {} discardChange=false
   */
  private async _processSendRequests(
    sendRequests: SendRequest[],
    discardChange = false
  ) {
    if (!this.privateKey) {
      throw new Error(
        `Wallet ${this.name} is missing either a network or private key`
      );
    }
    if (!this.cashaddr) {
      throw Error("attempted to send without a cashaddr");
    }
    // get input
    let utxos = await this.provider!.getUtxos(this.cashaddr);

    let bestHeight = await this.provider!.getBlockHeight()!;
    let spendAmount = await sumSendRequestAmounts(sendRequests);

    if (utxos.length === 0) {
      throw Error("There were no Unspent Outputs");
    }
    if (typeof spendAmount !== "bigint") {
      throw Error("Couldn't get spend amount when building transaction");
    }

    let feeEstimate = await getFeeAmount({
      utxos: utxos,
      sendRequests: sendRequests,
      privateKey: this.privateKey,
    });
    let fundingUtxos = await getSuitableUtxos(
      utxos,
      BigInt(spendAmount) + BigInt(feeEstimate),
      bestHeight
    );
    if (fundingUtxos.length === 0) {
      throw Error(
        "The available inputs couldn't satisfy the request with fees"
      );
    }
    let fee = await getFeeAmount({
      utxos: fundingUtxos,
      sendRequests: sendRequests,
      privateKey: this.privateKey,
    });
    let encodedTransaction = await buildEncodedTransaction(
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
  }
}

export class Wallet extends WifWallet {
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.mainnet);
  }

  // TODO refactor
  public static async fromWif(walletImportFormatString: string) {
    return await fromWif(
      walletImportFormatString,
      name, 
      CashAddressNetworkPrefix.mainnet,
    );
  }
  public static async fromId(walletId: string, name='') {
    return await fromId(walletId, name, CashAddressNetworkPrefix.mainnet);
  }
  public static async named(name = "", dbName?) {
    dbName = dbName ? dbName : CashAddressNetworkPrefix.mainnet;
    return await named(name, dbName, CashAddressNetworkPrefix.mainnet);
  }
  public static async newRandom(name = "", dbName?) {
    dbName = dbName ? dbName : CashAddressNetworkPrefix.mainnet;
    return await newRandom(name, dbName, CashAddressNetworkPrefix.mainnet);
  }
  public static async watchOnly(address: string, name="") {
    return await watchOnly(
      address,
      name, 
      CashAddressNetworkPrefix.mainnet
    );
  }
}

export class TestNetWallet extends WifWallet {
  static networkPrefix = CashAddressNetworkPrefix.testnet;
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.testnet);
  }
  
  // TODO refactor
  public static async fromWif(walletImportFormatString: string) {
    return await fromWif(
      walletImportFormatString,
      name, 
      CashAddressNetworkPrefix.testnet,
    );
  }
  public static async fromId(walletId: string, name='') {
    return await fromId(walletId, name, CashAddressNetworkPrefix.testnet);
  }
  public static async named(name='', dbName?){
    dbName = dbName ? dbName :  CashAddressNetworkPrefix.testnet
    return await named(name, dbName, CashAddressNetworkPrefix.testnet)
  }
  public static async newRandom(name='', dbName?) {
    dbName = dbName ? dbName :  CashAddressNetworkPrefix.testnet
    return await newRandom(name, dbName, CashAddressNetworkPrefix.testnet);
  }
  public static async watchOnly(address: string, name="") {
    return await watchOnly(
      address,
      name, 
      CashAddressNetworkPrefix.testnet
    );
  }
}

export class RegTestWallet extends WifWallet {
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.regtest);
  }

  // TODO refactor
  public static async fromWif(walletImportFormatString: string, name='') {
    return await fromWif(
      walletImportFormatString,
      name, 
      CashAddressNetworkPrefix.regtest,
    );
  }
  public static async fromId(walletId: string, name='') {
    return await fromId(walletId, name, CashAddressNetworkPrefix.regtest);
  }
  public static async named(name='', dbName?){
    dbName = dbName ? dbName :  CashAddressNetworkPrefix.regtest
    return await named(name, dbName, CashAddressNetworkPrefix.regtest)
  }
  public static async newRandom(name='', dbName?) {
    dbName = dbName ? dbName :  CashAddressNetworkPrefix.regtest
    return await newRandom(name, dbName, CashAddressNetworkPrefix.regtest);
  }
  public static async watchOnly(address: string, name="") {
    return await watchOnly(
      address,
      name, 
      CashAddressNetworkPrefix.regtest
    );
  }
}
