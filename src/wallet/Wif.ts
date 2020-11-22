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

import { WalletTypeEnum } from "./enum";
import { UnitEnum } from "../enum";

import { BaseWallet } from "./Base";

import { PrivateKey } from "../interface";

import { networkPrefixMap } from "../enum";

import {
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
import { derivePrefix } from "../util/derivePublicKeyHash";

const secp256k1Promise = instantiateSecp256k1();
const sha256Promise = instantiateSha256();

export class Wallet extends BaseWallet {
  publicKey?: Uint8Array;
  publicKeyHash?: Uint8Array;
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

  // Initialize wallet from Wallet Import Format
  public async fromWIF(secret: string): Promise<this> {
    const sha256 = await sha256Promise;
    const secp256k1 = await secp256k1Promise;
    let result = decodePrivateKeyWif(sha256, secret);

    const hasError = typeof result === "string";
    if (hasError) {
      throw Error(result as string);
    }
    checkWifNetwork(secret, this.networkType);
    let resultData: PrivateKey = result as PrivateKey;
    this.privateKey = resultData.privateKey;
    this.privateKeyWif = secret;
    this.walletType = WalletTypeEnum.Wif;
    this.publicKeyHash = secp256k1.derivePublicKeyCompressed(this.privateKey);
    this.cashaddr = (await deriveCashaddr(
      this.privateKey,
      this.networkPrefix
    )) as string;
    return this;
  }

  // Initialize a watch only wallet from a cash addr
  public async watchOnly(address: string) {
    let addressComponents = address.split(":");
    let addressPrefix, addressBase;
    if (addressComponents.length === 1) {
      addressBase = addressComponents.shift() as string;
      this.cashaddr = addressBase;
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
    }

    return this;
  }

  public async generate(): Promise<this> {
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
    return this;
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

  public static async fromId(walletId: string) {
    return await new this()._fromId(walletId);
  }

  public _fromId = async (walletId: string): Promise<this> => {
    let [
      walletType,
      networkGiven,
      privateImport,
      address,
    ]: string[] = walletId.split(":");
    if (!["watch", "wif", "seed"].includes(walletType)) {
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
        return this.fromWIF(privateImport);
      case "watch":
        if (address) {
          address = `${privateImport}:${address}`;
        } else {
          address = `${derivePrefix(privateImport)}:${privateImport}`;
        }
        return this.watchOnly(address);
      case "seed":
        throw new Error("Not implemented");
      default:
        return this.fromWIF(privateImport);
    }
  };

  public static named(
    name: string,
    dbName?: string,
    force?: boolean
  ): Promise<Wallet> {
    return new this()._named(name, dbName, force);
  }

  public static newRandom(name = "", dbName?: string): Promise<Wallet> {
    return new this()._newRandom(name, dbName);
  }
  public static fromWIF(wif): Promise<Wallet> {
    return new this().fromWIF(wif);
  }

  public static watchOnly(address): Promise<Wallet> {
    return new this().watchOnly(address);
  }

  public async sendMax(cashaddr: string): Promise<SendResponse> {
    try {
      let result = await this.sendMaxRaw(cashaddr);
      let resp = new SendResponse({});
      resp.txId = result;
      resp.balance = (await this.getBalance()) as BalanceResponse;
      return resp;
    } catch (e) {
      throw Error(e);
    }
  }

  public async sendMaxRaw(cashaddr: string) {
    let maxSpendableAmount = await this.getMaxAmountToSend({});
    if (maxSpendableAmount.sat === undefined) {
      throw Error("no Max amount to send");
    }
    let sendRequest = new SendRequest({
      cashaddr: cashaddr,
      value: maxSpendableAmount.sat,
      unit: "sat",
    });
    return await this._processSendRequests([sendRequest], true);
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
    return `${this.walletType}:${this.network}:${this.privateKeyWif}`;
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

export class TestNetWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.testnet;
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.testnet);
  }
}

export class RegTestWallet extends Wallet {
  static networkPrefix = CashAddressNetworkPrefix.regtest;
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.regtest);
  }
}
