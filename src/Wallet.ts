// Stable
import { instantiateSecp256k1, instantiateSha256 } from "@bitauth/libauth";

// Unstable?
import {
  authenticationTemplateP2pkhNonHd,
  authenticationTemplateToCompilerBCH,
  bigIntToBinUint64LE,
  cashAddressToLockingBytecode,
  CashAddressNetworkPrefix,
  CompilationData,
  decodePrivateKeyWif,
  encodePrivateKeyWif,
  encodeTransaction,
  generateTransaction,
  generatePrivateKey,
  lockingBytecodeToCashAddress,
  validateAuthenticationTemplate,
  WalletImportFormatType,
} from "@bitauth/libauth";

import { GrpcClient } from "grpc-bchrpc-node";
import { UnspentOutput } from "grpc-bchrpc-node/pb/bchrpc_pb";

const secp256k1Promise = instantiateSecp256k1();
const sha256Promise = instantiateSha256();

interface PrivateKey {
  privateKey: Uint8Array;
  type: WalletImportFormatType;
}

class SendRequest {
  address: string;
  amount: Amount;

  constructor(SerializedSendRequest: any) {
    this.address = SerializedSendRequest[0];
    this.amount = new Amount(SerializedSendRequest[1]);
  }
}

class Amount {
  amount: number;
  unit: UnitType;
  constructor(SerializedAmount: any) {
    this.amount = SerializedAmount[0];
    this.unit = SerializedAmount[1];
  }

  public inSatoshi(): number | Error {
    switch (this.unit) {
      case "satoshi":
        return this.amount;
      case "coin":
        return this.amount / 10e8;
      default:
        throw Error("Unit of value not defined");
    }
  }
}

export type NetworkType = "mainnet" | "testnet";
export type UnitType = "coin" | "bits" | "satoshi";
export type WalletType = "wif" | "hd";

/**
 * A class to hold features used by all wallets
 * @class  BaseWallet
 */
export class BaseWallet {
  client?: GrpcClient;
  isTestnet?: boolean;
  name: string;
  networkPrefix: CashAddressNetworkPrefix;
  networkType: NetworkType;

  constructor(name = "", networkPrefix: CashAddressNetworkPrefix) {
    this.name = name;
    this.networkPrefix = networkPrefix;
    this.networkType =
      this.networkPrefix === CashAddressNetworkPrefix.mainnet
        ? "mainnet"
        : "testnet";
    this.isTestnet = this.networkType === "testnet" ? true : false;
    if (this.isTestnet) {
      const url = `${process.env.HOST_IP}:${process.env.GRPC_PORT}`;
      const cert = `${process.env.BCHD_BIN_DIRECTORY}/${process.env.RPC_CERT}`;
      const host = `${process.env.HOST}`;
      this.client = new GrpcClient({
        url: url,
        testnet: true,
        rootCertPath: cert,
        options: {
          "grpc.ssl_target_name_override": host,
          "grpc.default_authority": host,
          "grpc.max_receive_message_length": -1,
        },
      });
    } else {
      throw Error(process.env.WARNING);
    }
  }
}

export class CommonWallet extends BaseWallet {
  name: string;

  publicKey?: Uint8Array;
  publicKeyCompressed?: Uint8Array;
  privateKey?: Uint8Array;
  privateKeyWif?: string;
  walletType?: WalletType;
  cashaddr?: string;
  client?: GrpcClient;

  constructor(name = "", networkPrefix: CashAddressNetworkPrefix) {
    super(name, networkPrefix);
    this.name = name;
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
      this.walletType = "wif";
      this.publicKey = secp256k1.derivePublicKeyCompressed(this.privateKey);
      this.cashaddr = (await this._deriveCashAddr(
        this.privateKey,
        this.networkPrefix
      )) as string;
    }
  }

  public async generateWif(): Promise<void | Error> {
    const sha256 = await sha256Promise;
    const secp256k1 = await secp256k1Promise;

    // nodejs
    if (typeof process !== undefined) {
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
    this.cashaddr = (await this._deriveCashAddr(
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
  private async _getBalance(address: string): Promise<number> {
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
    return await this._getBalance(address);
  }

  // Return address balance in bitcoin
  public async balance(address: string): Promise<number> {
    return (await this._getBalance(address)) / 10e8;
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
        includeMempool: false,
      });
      let utxo = utxos?.getOutputsList()[101];

      // build transaction
      if (utxo) {
        let txn = await this._buildP2pkhNonHdTransaction(utxo, request);
        // submit transaction
        if (txn.success) {
          return await this._submitTransaction(
            encodeTransaction(txn.transaction)
          );
        } else {
          throw Error(JSON.stringify(txn));
        }
      } else {
        throw Error(
          "No single input in the wallet can satisfy this send request"
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

  // Given a private key and network, derive cashaddr from the locking code
  // TODO, is there a more direct way to do this?
  // TODO, This can be moved off the Wallet Class
  public async _deriveCashAddr(
    privateKey: Uint8Array,
    networkPrefix: CashAddressNetworkPrefix
  ) {
    const lockingScript = "lock";
    const template = validateAuthenticationTemplate(
      authenticationTemplateP2pkhNonHd
    );
    if (typeof template === "string") {
      throw new Error("Address template error");
    }
    const lockingData: CompilationData<never> = {
      keys: { privateKeys: { key: privateKey } },
    };
    const compiler = await authenticationTemplateToCompilerBCH(template);
    const lockingBytecode = compiler.generateBytecode(
      lockingScript,
      lockingData
    );

    if (!lockingBytecode.success) {
      throw Error(JSON.stringify(lockingBytecode));
    } else {
      return lockingBytecodeToCashAddress(
        lockingBytecode.bytecode,
        networkPrefix
      );
    }
  }

  // Build a transaction for a p2pkh transaction for a non HD wallet
  private async _buildP2pkhNonHdTransaction(
    input: UnspentOutput,
    output: SendRequest
  ) {
    const template = validateAuthenticationTemplate(
      authenticationTemplateP2pkhNonHd
    );

    if (typeof template === "string") {
      throw new Error("Transaction template error");
    }

    const utxoTxnValue = input.getValue();
    const utxoIndex = input.getOutpoint()?.getIndex();

    // TODO,
    // Figure out why this hash is reversed, prevent the hash from being flipped in the first place
    const utxoOutpointTransactionHash = input
      .getOutpoint()
      ?.getHash_asU8()
      .reverse();

    if (!utxoOutpointTransactionHash || utxoIndex === undefined) {
      throw new Error("Missing unspent outpoint when building transaction");
    }

    if (!this.privateKey) {
      throw new Error("Missing signing key when building transaction");
    }

    const compiler = await authenticationTemplateToCompilerBCH(template);

    try {
      let outputLockingBytecode = cashAddressToLockingBytecode(output.address);

      if (
        !outputLockingBytecode.hasOwnProperty("bytecode") ||
        !outputLockingBytecode.hasOwnProperty("prefix")
      ) {
        throw new Error(outputLockingBytecode.toString());
      }
      outputLockingBytecode = outputLockingBytecode as {
        bytecode: Uint8Array;
        prefix: string;
      };

      // Get the change locking bytecode
      let changeLockingBytecode = compiler.generateBytecode("lock", {
        keys: { privateKeys: { key: this.privateKey } },
      });
      if (!changeLockingBytecode.success) {
        throw new Error(changeLockingBytecode.toString());
      }

      const result = generateTransaction({
        inputs: [
          {
            outpointIndex: utxoIndex,
            outpointTransactionHash: utxoOutpointTransactionHash,
            sequenceNumber: 0,
            unlockingBytecode: {
              compiler,
              data: {
                keys: { privateKeys: { key: this.privateKey } },
              },
              satoshis: bigIntToBinUint64LE(BigInt(utxoTxnValue)),
              script: "unlock",
            },
          },
        ],
        locktime: 0,
        outputs: [
          {
            lockingBytecode: outputLockingBytecode.bytecode,
            satoshis: bigIntToBinUint64LE(BigInt(output.amount.inSatoshi())),
          },
          {
            lockingBytecode: changeLockingBytecode.bytecode,
            satoshis: bigIntToBinUint64LE(BigInt(changeAmount)),
          },
        ],
        version: 2,
      });

      return result;
    } catch (error) {
      throw Error(error.toString());
    }
  }
}

export class RegTestWallet extends CommonWallet {
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.regtest);
  }
}

export class TestnetWallet extends CommonWallet {
  constructor(name = "") {
    super(name, CashAddressNetworkPrefix.testnet);
  }
}

export class Wallet extends CommonWallet {
  constructor(name = "") {
    throw Error(process.env.WARNING);
    super(name, CashAddressNetworkPrefix.mainnet);
  }
}
