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
import { checkWifNetwork } from "../util/checkWifNetwork";
import { deriveCashaddr } from "../util/deriveCashaddr";
import {
  balanceResponseFromSatoshi,
  BalanceResponse,
} from "../util/balanceObjectFromSatoshi";
import { sumUtxoValue } from "../util/sumUtxoValue";
import { sumSendRequestAmounts } from "../util/sumSendRequestAmounts";

const secp256k1Promise = instantiateSecp256k1();
const sha256Promise = instantiateSha256();

export class WifWallet extends BaseWallet {
  publicKey?: Uint8Array;
  publicKeyCompressed?: Uint8Array;
  privateKey?: Uint8Array;
  privateKeyWif?: string;
  walletType?: WalletTypeEnum;
  cashaddr?: string;

  constructor(name = "", networkPrefix: CashAddressNetworkPrefix) {
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
    this.privateKey = secp256k1.derivePublicKeyCompressed(this.privateKey);
    this.privateKeyWif = encodePrivateKeyWif(
      sha256,
      this.privateKey,
      this.networkType
    );
    this.walletType = WalletTypeEnum.Wif;
    this.cashaddr = (await deriveCashaddr(
      this.privateKey,
      this.networkPrefix
    )) as string;
  }

  public async send(requests: SendRequest[]): Promise<SendResponse> {
    try {
      let result = await this._processSendRequests(requests);
      let resp = new SendResponse({});
      resp.transactionId = result;
      resp.balance = await this.getBalance();
      return resp;
    } catch (e) {
      throw e;
    }
  }

  // Processes an array of send requests
  public async sendRaw(requests: Array<any>) {
    // Deserialize the request
    const sendRequests: SendRequest[] = await Promise.all(
      requests.map(async (rawSendRequest: any) => {
        return new SendRequest(rawSendRequest);
      })
    );
    return await this._processSendRequests(sendRequests);
  }

  public async sendMax(sendMaxRequest: SendMaxRequest): Promise<SendResponse> {
    try {
      let result = await this.sendMaxRaw(sendMaxRequest);
      let resp = new SendResponse({});
      resp.transactionId = result;
      resp.balance = await this.getBalance();
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
      unit: UnitEnum.Sat,
    });
    return await this._processSendRequests([sendRequest], true);
  }

  public getSerializedWallet() {
    return `${this.walletType}:${this.network}:${this.privateKeyWif}`;
  }

  public getDepositAddress() {
    return { cashaddr: this.cashaddr };
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

  public async getBalance() {
    // TODO handle other denominations
    return await balanceResponseFromSatoshi(await this.getBalanceFromUtxos());
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
      unit: UnitEnum.Sat,
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
        utxo.unit = UnitEnum.Sat;
        utxo.value = o.satoshis;

        utxo.transactionId = o.txid;
        utxo.index = o.vout;
        utxo.utxoId = utxo.transactionId + ":" + utxo.index;
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

    let fee = await getFeeAmount({
      utxos: utxos,
      sendRequests: sendRequests,
      privateKey: this.privateKey,
    });
    let fundingUtxos = await getSuitableUtxos(
      utxos,
      BigInt(spendAmount) + BigInt(fee),
      bestHeight
    );
    if (fundingUtxos.length === 0) {
      throw Error(
        "The available inputs couldn't satisfy the request with fees"
      );
    }
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

const fromWIF = async (
  walletImportFormatString: string,
  network: CashAddressNetworkPrefix
) => {
  let w = new WifWallet("", network);
  await w.initializeWIF(walletImportFormatString);
  return w;
};

const watchOnly = async (
  walletImportFormatString: string,
  network: CashAddressNetworkPrefix
) => {
  let w = new WifWallet("", network);
  await w.initializeWatchOnly(walletImportFormatString);
  return w;
};

export class MainnetWallet extends WifWallet {
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.mainnet);
  }

  public static async fromWIF(walletImportFormatString: string) {
    return await fromWIF(
      walletImportFormatString,
      CashAddressNetworkPrefix.mainnet
    );
  }

  public static async watchOnly(walletImportFormatString: string) {
    return await watchOnly(
      walletImportFormatString,
      CashAddressNetworkPrefix.mainnet
    );
  }
}

export class TestnetWallet extends WifWallet {
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.testnet);
  }

  public static async fromWIF(walletImportFormatString: string) {
    return await fromWIF(
      walletImportFormatString,
      CashAddressNetworkPrefix.testnet
    );
  }
  public static async watchOnly(walletImportFormatString: string) {
    return await watchOnly(
      walletImportFormatString,
      CashAddressNetworkPrefix.testnet
    );
  }
}

export class RegTestWallet extends WifWallet {
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.regtest);
  }
  public static async fromWIF(walletImportFormatString: string) {
    return await fromWIF(
      walletImportFormatString,
      CashAddressNetworkPrefix.regtest
    );
  }
  public static async watchOnly(walletImportFormatString: string) {
    return await watchOnly(
      walletImportFormatString,
      CashAddressNetworkPrefix.regtest
    );
  }
}
