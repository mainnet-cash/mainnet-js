// Stable
import { instantiateSecp256k1, instantiateSha256 } from "@bitauth/libauth";

// Unstable?
import {
  binToHex,
  CashAddressNetworkPrefix,
  decodePrivateKeyWif,
  encodePrivateKeyWif,
  generatePrivateKey,
  WalletImportFormatType,
} from "@bitauth/libauth";

import {
  Amount,
  BaseWallet,
  SendMaxRequest,
  SendRequest,
  SendResponse,
  UnitEnum,
  WalletTypeEnum,
} from "./Base";
import {
  buildEncodedTransaction,
  getSuitableUtxos,
  getFeeAmount,
} from "../transaction/Wif";
import { qrAddress } from "../qr/Qr";
import { deriveCashaddr } from "../util/deriveCashaddr";
import {
  balanceResponseFromSatoshi,
  BalanceResponse,
} from "../util/balanceObjectFromSatoshi";
import { sumUtxoValue } from "../util/sumUtxoValue";
import { sumSendRequestAmounts } from "../util/sumSendRequestAmounts";
import { UnspentOutput } from "grpc-bchrpc-node/pb/bchrpc_pb";

const secp256k1Promise = instantiateSecp256k1();
const sha256Promise = instantiateSha256();

interface PrivateKey {
  privateKey: Uint8Array;
  type: WalletImportFormatType;
}

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
  public async watchOnly(address: string) {
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
  public async fromWIF(
    walletImportFormatString: string
  ): Promise<void | Error> {
    const sha256 = await sha256Promise;
    const secp256k1 = await secp256k1Promise;
    let result = decodePrivateKeyWif(sha256, walletImportFormatString);

    const hasError = typeof result === "string";
    if (hasError) {
      throw Error(result as string);
    } else {
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

  public async send(requests: Array<any>): Promise<SendResponse> {
    let result = await this.sendRaw(requests);
    let resp = new SendResponse({});
    resp.transaction = binToHex(result);
    resp.balance = await this.balance();
    return resp;
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
    let result = await this.sendMaxRaw(sendMaxRequest);
    let resp = new SendResponse({});
    resp.transaction = binToHex(result);
    resp.balance = await this.balance();
    return resp;
  }

  public async sendMaxRaw(sendMaxRequest: SendMaxRequest) {
    let maxSpendableAmount = await this.getMaxAmountToSpend();
    if (maxSpendableAmount.sat === undefined) {
      throw Error("no Max amount to send");
    }
    let sendRequest = new SendRequest({
      cashaddr: sendMaxRequest.cashaddr,
      amount: new Amount({ value: maxSpendableAmount.sat, unit: UnitEnum.Sat }),
    });
    return await this._processSendRequests([sendRequest], true);
  }

  public getSerializedWallet() {
    return `${this.walletType}:${this.network}:${this.privateKeyWif}`;
  }

  public depositAddress() {
    return this.cashaddr;
  }

  public depositQr() {
    return qrAddress(this.cashaddr as string);
  }

  public async getUtxos(address: string): Promise<UnspentOutput[]> {
    if (!this.client) {
      throw Error("Attempting to get utxos from wallet without a client");
    }
    const res = await this.client.getAddressUtxos({
      address: address,
      includeMempool: true,
    });
    if (!res) {
      throw Error("No Utxo response from server");
    }
    return res.getOutputsList();
  }

  public async balance() {
    return balanceResponseFromSatoshi(await this.getBalance());
  }

  // Gets balance by summing value in all utxos in stats
  public async getBalance(): Promise<number> {
    const utxos = await this.getUtxos(this.cashaddr!);
    return await sumUtxoValue(utxos);
  }

  public toString() {
    return `${this.walletType}:${this.networkType}:${this.privateKeyWif}`;
  }

  public async getMaxAmountToSpend(outputCount = 1): Promise<BalanceResponse> {
    if (!this.privateKey) {
      throw Error("Couldn't get network or private key for wallet.");
    }
    if (!this.cashaddr) {
      throw Error("attempted to send without a cashaddr");
    }
    // get inputs
    let utxos = await this.getUtxos(this.cashaddr);

    // Get current height to assure recently mined coins are not spent.
    let bestHeight = (await this.client!.getBlockchainInfo())!.getBestHeight();
    let amount = new Amount({ value: 100, unit: UnitEnum.Sat });

    // simulate outputs using the sender's address
    const sendRequest = new SendRequest({
      cashaddr: this.cashaddr,
      amount: amount,
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

    return balanceResponseFromSatoshi(spendableAmount - fee);
  }

  // Process an individual send request
  //
  //
  private async _processSendRequests(
    sendRequests: SendRequest[],
    discardChange=true
  ) {
    if (!this.privateKey) {
      throw Error(
        `Wallet ${this.name} is missing either a network or private key`
      );
    }
    if (!this.cashaddr) {
      throw Error("attempted to send without a cashaddr");
    }
    // get input
    let utxos = await this.getUtxos(this.cashaddr);

    let bestHeight = (await this.client!.getBlockchainInfo())!.getBestHeight();
    let spendAmount = await sumSendRequestAmounts(sendRequests);

    if (utxos.length === 0) {
      throw Error(
        "There were no Unspent Outputs or the send amount could not be parsed"
      );
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
  private async _submitTransaction(
    transaction: Uint8Array
  ): Promise<Uint8Array> {
    if (!this.client) {
      throw Error("Wallet node client was not initialized");
    }
    const res = await this.client.submitTransaction({ txn: transaction });
    return res.getHash_asU8();
  }
}

export class MainnetWallet extends WifWallet {
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.mainnet);
  }
}

export class TestnetWallet extends WifWallet {
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.testnet);
  }
}

export class RegTestWallet extends WifWallet {
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.regtest);
  }
}
