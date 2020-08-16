require("dotenv").config();
// Stable
import { instantiateSecp256k1 } from "@bitauth/libauth";

// Unstable?
import {
  authenticationTemplateToCompilerBCH,
  bigIntToBinUint64LE,
  cashAddressToLockingBytecode,
  decodePrivateKeyWif,
  encodeTransaction,
  generateTransaction,
  instantiateSha256,
  validateAuthenticationTemplate,
  WalletImportFormatType,
} from "@bitauth/libauth";

import { p2pkTemplate } from "./templates/p2pkTemplate"


import { GrpcClient } from "grpc-bchrpc-node";
import { UnspentOutput } from "grpc-bchrpc-node/pb/bchrpc_pb";

var grpc = require('grpc');

//import { Transaction }

const secp256k1Promise = instantiateSecp256k1();
const sha256Promise = instantiateSha256();


interface PrivateKey {
  privateKey: Uint8Array,
  type: WalletImportFormatType
}

class SendRequest {
  address: string;
  amount: Amount;

  constructor(SerializedSendRequest) {
    this.address = SerializedSendRequest[0]
    this.amount = new Amount(SerializedSendRequest[1])
  }
}

class Amount {
  amount: number;
  unit: UnitType;
  constructor(SerializedAmount) {
    this.amount = SerializedAmount[0]
    this.unit = SerializedAmount[1]
  }
}

export type WIFNetworkType = | 'mainnet' | 'testnet'
export type UnitType = | 'coin' | 'bits' | 'satoshi'

export class Wallet {
  name: string;
  network?: string;
  isTestnet?: boolean;
  EcAddress?: string;
  publicKey?: Uint8Array;
  privateKey?: Uint8Array;
  client?: GrpcClient

  constructor(name = "") {
    this.name = name;
  }

  public async watchOnly(address:string){
    this.EcAddress = address
    this.network = address.startsWith("bitcoincash:") ? "mainnet" : "testnet"
    this.isTestnet = this.network === "testnet" ? true : false
  }

  public async fromWIF(walletImportFormatString: string) {
    const sha256 = await sha256Promise;
    const secp256k1 = await secp256k1Promise;
    let result = decodePrivateKeyWif(sha256, walletImportFormatString);

    const hasError = typeof result === 'string';
    if (hasError) {
      return new Error(result as string)
    } else {
      let resultData: PrivateKey = (result as PrivateKey)
      
      this.privateKey = resultData.privateKey
      this.publicKey = secp256k1.derivePublicKeyUncompressed(this.privateKey)

      this.network = resultData.type.startsWith("mainnet") ? "mainnet" : "testnet"
      this.isTestnet = this.network === "testnet" ? true : false

      this.client = new GrpcClient(
        {
          url: `https://${process.env.REGTEST_HOST}:${process.env.REGTEST_PORT}`,
          testnet: this.isTestnet,
          rootCertPath: process.env.RPC_CERT,
          options:  {
            'grpc.ssl_target_name_override' : process.env.REGTEST_HOST,
            'grpc.default_authority': process.env.REGTEST_HOST,
            "grpc.max_receive_message_length": -1,
          }
        }
      );
    }
  }

  public async send(requests: Array<any>) {

    // Deserialize the request
    const sendRequestList: SendRequest[] = await Promise.all(
      requests.map(async (rawSendRequest: any) => { return new SendRequest(rawSendRequest) })
    );

    // Process the requests
    const sendResponseList: Uint8Array[] = await Promise.all(
      sendRequestList.map(async (sendRequest: SendRequest) => { return this._processSendRequest(sendRequest) })
    );
    return sendResponseList
  }



  private async _getBalance(address: string): Promise<number> {

    const res = await this.client.getAddressUtxos({ address: address, includeMempool: true });
    const txns = res.getOutputsList();

    const balanceArray: number[] = await Promise.all(txns.map(async (o: UnspentOutput) => { return o.getValue() }));
    return balanceArray.reduce((a: number, b: number) => a + b, 0);
  }

  public async balanceSats(address: string): Promise<number> {
    return await this._getBalance(address);
  }

  public async balance(address: string): Promise<number> {
    return await this._getBalance(address) / 10e6;
  }

  private async _processSendRequest(request: SendRequest) {
    if (this.network && this.privateKey) {
      //build transaction
      // get input
      const utxo = this._getUnspentOutputs(process.env.REGTEST_ADDRESS)[0]
      let txn = await this._buildP2pkhTransaction(utxo, request)
      if(txn.success){
        return await this._submitTransaction(encodeTransaction(txn.transaction))
      }

      //submit transaction

    } else {
      throw Error(`Wallet ${this.name} hasn't been set with a private key`)
    }
  }

  private async _submitTransaction(transaction: Uint8Array): Promise<Uint8Array> {

    const res = await this.client.submitTransaction({ txn: transaction });
    return res.getHash_asU8()
  }

  private async _getUnspentOutputs(address: string) {
    return await this.client.getAddressUtxos({ address: address, includeMempool: true })

  }

  private async _buildP2pkhTransaction(input:UnspentOutput, output:SendRequest) {
    const template = validateAuthenticationTemplate(p2pkTemplate);

    if (typeof template === 'string') {
      throw new Error("Transaction template error")
    }

    const compiler = await authenticationTemplateToCompilerBCH(template);
    const inputLockingBytecode = compiler.generateBytecode('lock', {
      keys: { privateKeys: { owner: this.privateKey } },
    });

    if (!inputLockingBytecode.success) {
      throw new Error(inputLockingBytecode.toString());
    }

    const satoshis = 1000000;

    const outputIndex = input.getOutpoint().getIndex()
    const outputHash = input.getOutpoint().getHash_asU8()

    let  outputLockingBytecode = cashAddressToLockingBytecode(output.address) 
    
    if (!outputLockingBytecode.hasOwnProperty('bytecode') || outputLockingBytecode.hasOwnProperty('prefix')) {
      throw new Error(outputLockingBytecode.toString());
    } 
    outputLockingBytecode = outputLockingBytecode as { bytecode: Uint8Array; prefix: string }
    

    const result = generateTransaction({
      inputs: [
        {
          outpointIndex: outputIndex,
          outpointTransactionHash: outputHash,
          sequenceNumber: 0,
          unlockingBytecode: {
            compiler: compiler,
            data: {
              keys: { privateKeys: { owner: this.privateKey } },
            },
            satoshis: bigIntToBinUint64LE(BigInt(satoshis)),
            script: 'unlock',
          },
        },
      ],
      locktime: 0,
      outputs: [
        {
          lockingBytecode: outputLockingBytecode.bytecode,
          satoshis: bigIntToBinUint64LE(BigInt(output.amount)),
        },
      ],
      version: 2,
    });

    return result

  }

}


