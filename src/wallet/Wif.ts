// Stable
import { instantiateSecp256k1, instantiateSha256 } from "@bitauth/libauth";

// Unstable?
import {
  CashAddressNetworkPrefix,
  decodePrivateKeyWif,
  encodePrivateKeyWif,
  encodeTransaction,
  generatePrivateKey,
  WalletImportFormatType,
} from "@bitauth/libauth";

import { BaseWallet, SendRequest, WalletType } from "./Base";
import {
  buildP2pkhNonHdTransaction,
  getSuitableUtxos,
} from "../transaction/Wif";
import { deriveCashAddr } from "../cashaddr";
import { UnspentOutput } from "grpc-bchrpc-node/pb/bchrpc_pb";
import { getRandomInt } from "../util/randomInt";
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
  walletType?: WalletType;
  cashaddr?: string;

  constructor(name = "", networkPrefix: CashAddressNetworkPrefix) {
    super(name, networkPrefix);
    this.name = name;
    this.walletType = "wif";
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
      return new Error(result as string);
    } else {
      let resultData: PrivateKey = result as PrivateKey;
      this.privateKey = resultData.privateKey;
      this.privateKeyWif = walletImportFormatString;
      this.walletType = "wif";
      this.publicKey = secp256k1.derivePublicKeyCompressed(this.privateKey);
      this.cashaddr = (await deriveCashAddr(
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
    // window, webworkers, serviceworkers
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
    this.walletType = "wif";
    this.cashaddr = (await deriveCashAddr(
      this.privateKey,
      this.networkPrefix
    )) as string;
  }

  // Processes an array of send requests
  public async send(requests: Array<any>) {
    // Deserialize the request
    const sendRequestList: SendRequest[] = await Promise.all(
      requests.map(async (rawSendRequest: any) => {
        return new SendRequest(rawSendRequest);
      })
    );

    // Process the requests
    const sendResponseList: Uint8Array[] = await Promise.all(
      sendRequestList.map(async (sendRequest: SendRequest) => {
        return this._processSendRequest(sendRequest);
      })
    );
    return sendResponseList;
  }

  public getSerializedWallet() {
    return `${this.walletType}:${this.networkPrefix}:${this.privateKeyWif}`;
  }

  // Gets balance by summing value in all utxos in stats
  public async getBalance(address: string): Promise<number> {
    const res = await this.client?.getAddressUtxos({
      address: address,
      includeMempool: true,
    });
    const txns = res?.getOutputsList();

    if (txns) {
      const balanceArray: number[] = await Promise.all(
        txns.map(async (o: UnspentOutput) => {
          return o.getValue();
        })
      );
      const balance = balanceArray.reduce((a: number, b: number) => a + b, 0);
      return balance;
    } else {
      return 0;
    }
  }

  public toString() {
    return `${this.walletType}:${this.networkType}:${this.privateKeyWif}`;
  }

  // Return address balance in satoshi
  public async balanceSats(address: string): Promise<number> {
    return await this.getBalance(address);
  }

  // Return address balance in bitcoin
  public async balance(address: string): Promise<number> {
    return (await this.getBalance(address)) / 10e8;
  }

  // Process an individual send request
  private async _processSendRequest(request: SendRequest) {
    if (this.networkPrefix && this.privateKey) {
      // get input
      if (!this.cashaddr) {
        throw Error("attempted to send without a cashaddr");
      }

      let utxos = await this.client?.getAddressUtxos({
        address: this.cashaddr,
        includeMempool: true,
      });

      let bestHeight =
        (await this.client?.getBlockchainInfo())?.getBestHeight() ?? 0;
      let spendAmount = request.amount.inSatoshi();

      // TODO refactor this
      if (utxos && typeof spendAmount === "number") {
        let outputList = utxos?.getOutputsList() || [];
        let draftUtxos = await getSuitableUtxos(
          outputList,
          spendAmount,
          bestHeight
        );
        // build transaction
        if (draftUtxos) {
          // Build the transaction to get the approximate size
          let draftTransaction = await this._buildEncodedTransaction(
            draftUtxos,
            request,
            this.privateKey,
            10
          );
          let fee = draftTransaction.length * 2 + getRandomInt(1000);
          let fundingUtxos = await getSuitableUtxos(
            outputList,
            spendAmount + fee,
            bestHeight
          );
          if (fundingUtxos) {
            let encodedTransaction = await this._buildEncodedTransaction(
              fundingUtxos,
              request,
              this.privateKey,
              fee
            );
            return await this._submitTransaction(encodedTransaction);
          } else {
            throw Error(
              "The available inputs couldn't satisfy the request with fees"
            );
          }
        } else {
          throw Error(
            "The available inputs in the wallet cannot satisfy this send request"
          );
        }
      } else {
        throw Error(
          "There were no Unspent Outputs or the send amount could not be parsed"
        );
      }
    } else {
      throw Error(
        `Wallet ${this.name} hasn't is missing either a network or private key`
      );
    }
  }

  // Build encoded transaction
  private async _buildEncodedTransaction(
    fundingUtxos,
    request,
    privateKey,
    fee = 0
  ) {
    let txn = await buildP2pkhNonHdTransaction(
      fundingUtxos,
      request,
      privateKey,
      fee
    );
    // submit transaction
    if (txn.success) {
      return encodeTransaction(txn.transaction);
    } else {
      throw Error("Error building transaction with fee");
    }
  }

  // Submit a raw transaction
  private async _submitTransaction(
    transaction: Uint8Array
  ): Promise<Uint8Array> {
    if (this.client) {
      const res = await this.client.submitTransaction({ txn: transaction });
      return res.getHash_asU8();
    } else {
      throw Error("Wallet node client was not initialized");
    }
  }
}

export class Wallet extends WifWallet {
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
