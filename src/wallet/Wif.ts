// Stable
import { instantiateSecp256k1, instantiateSha256 } from "@bitauth/libauth";

// Unstable?
import {
  CashAddressNetworkPrefix,
  decodePrivateKeyWif,
  encodePrivateKeyWif,
  generatePrivateKey,
  WalletImportFormatType,
} from "@bitauth/libauth";

import {bch} from "../chain"
import { Amount, BaseWallet, SendRequest, UnitType, WalletType } from "./Base";
import {
  buildEncodedTransaction,
  getSuitableUtxos,
  getFeeAmount,
} from "../transaction/Wif";
import { deriveCashaddr } from "../util/deriveCashaddr";
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
  walletType?: WalletType.TypeEnum;
  cashaddr?: string;

  constructor(name = "", networkPrefix: CashAddressNetworkPrefix) {
    super(name, networkPrefix);
    this.name = name;
    this.walletType = WalletType.TypeEnum.Wif;
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
      this.walletType = WalletType.TypeEnum.Wif;
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
    this.walletType = WalletType.TypeEnum.Wif;
    this.cashaddr = (await deriveCashaddr(
      this.privateKey,
      this.networkPrefix
    )) as string;
  }

  // Processes an array of send requests
  public async send(requests: Array<any>) {
    // Deserialize the request
    const sendRequests: SendRequest[] = await Promise.all(
      requests.map(async (rawSendRequest: any) => {
        return new SendRequest(rawSendRequest);
      })
    );

    // Process the requests
    const sendResponseList: Uint8Array[] = await Promise.all(
      sendRequests.map(async (sendRequests: SendRequest[]) => {
        return this._processSendRequests(sendRequests);
      })
    );
    return sendResponseList;
  }

  public getSerializedWallet() {
    return `${this.walletType}:${this.networkPrefix}:${this.privateKeyWif}`;
  }

  public depositQr() {
    return;
  }
  public async getUtxos(address: string): Promise<UnspentOutput[]> {
    const res = await this.client?.getAddressUtxos({
      address: address,
      includeMempool: true,
    });
    return res?.getOutputsList() || [];
  }

  // Gets balance by summing value in all utxos in stats
  public async getBalance(address: string): Promise<number> {
    const utxos = await this.getUtxos(address);
    return await sumUtxoValue(utxos);
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
    return (await this.getBalance(address)) / bch.subUnits;
  }

  public async getMaxAmountToSpend(outputCount = 1): Promise<number> {
    if (this.networkPrefix && this.privateKey) {
      if (!this.cashaddr) {
        throw Error("attempted to send without a cashaddr");
      }
      // get inputs
      let utxos = await this.getUtxos(this.cashaddr);

      // Get current height to assure recently mined coins are not spent.
      let bestHeight =
        (await this.client?.getBlockchainInfo())?.getBestHeight() ?? 0;
      let amount = new Amount({ value: 100, unit: UnitType.UnitEnum.Sat });

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
      return spendableAmount - fee;
    } else {
      throw Error("Couldn't get network or private key for wallet.");
    }
  }

  // Process an individual send request
  //
  //
  private async _processSendRequests(sendRequests: SendRequest[]) {
    if (this.networkPrefix && this.privateKey) {
      if (!this.cashaddr) {
        throw Error("attempted to send without a cashaddr");
      }
      // get input
      let utxos = await this.getUtxos(this.cashaddr);

      let bestHeight =
        (await this.client?.getBlockchainInfo())?.getBestHeight() ?? 0;
      let spendAmount = await sumSendRequestAmounts(sendRequests);

      // TODO refactor this
      if (utxos && typeof spendAmount === "number") {
        let fee = await getFeeAmount({
          utxos: utxos,
          sendRequests: sendRequests,
          privateKey: this.privateKey,
        });
        let fundingUtxos = await getSuitableUtxos(
          utxos,
          spendAmount + fee,
          bestHeight
        );
        if (fundingUtxos) {
          let encodedTransaction = await buildEncodedTransaction(
            fundingUtxos,
            sendRequests,
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
          "There were no Unspent Outputs or the send amount could not be parsed"
        );
      }
    } else {
      throw Error(
        `Wallet ${this.name} hasn't is missing either a network or private key`
      );
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
