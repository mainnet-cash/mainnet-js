import {
  Transaction as LibAuthTransaction,
  assertSuccess,
  binToHex,
  decodeTransaction as decodeTransactionLibAuth,
  hexToBin,
  isPayToPublicKey,
  lockingBytecodeToAddressContents,
  lockingBytecodeToCashAddress,
  publicKeyToP2pkhCashAddress,
} from "@bitauth/libauth";
import { bchParam } from "../chain.js";
import { NetworkType, prefixFromNetworkMap } from "../enum.js";
import { getNetworkProvider } from "../network/default.js";
import {
  ElectrumRawTransaction,
  ElectrumRawTransactionVin,
  ElectrumRawTransactionVinScriptSig,
  ElectrumRawTransactionVout,
  ElectrumRawTransactionVoutScriptPubKey,
} from "../network/interface.js";
import NetworkProvider from "../network/NetworkProvider.js";
import { getTransactionHash } from "../util/transaction.js";

/**
 * Class with various wallet utilities.
 */
export class Util {
  readonly network: NetworkType;
  provider: NetworkProvider;

  /**
   * Initializes a wallet Util class.
   *
   * @param network     The network type to use. Defaults to mainnet.
   */
  constructor(network = NetworkType.Mainnet) {
    this.network = network;
    this.provider = getNetworkProvider(network);
  }

  public async getTransactionHash(rawTransactionHex: string): Promise<string> {
    return getTransactionHash(rawTransactionHex);
  }

  public static async getTransactionHash(
    rawTransactionHex: string
  ): Promise<string> {
    return getTransactionHash(rawTransactionHex);
  }

  public async decodeTransaction(
    transactionHashOrHex: string,
    loadInputValues: boolean = false
  ): Promise<ElectrumRawTransaction> {
    let transactionHex: string;
    let transactionBin: Uint8Array;
    let txHash: string;

    // raw transaction
    if (transactionHashOrHex.length > 64) {
      txHash = await this.getTransactionHash(transactionHashOrHex);
      transactionBin = hexToBin(transactionHashOrHex);
      transactionHex = transactionHashOrHex;
    } else {
      // tx hash, look up the raw transaction
      txHash = transactionHashOrHex;
      transactionHex = await this.provider.getRawTransaction(txHash);
      transactionBin = hexToBin(transactionHex);
    }

    const result = decodeTransactionLibAuth(transactionBin);
    if (typeof result === "string") {
      throw Error(result);
    }

    const transaction = this.mapToElectrumRawTransaction(
      result,
      txHash,
      transactionHex
    );

    if (loadInputValues) {
      // get unique transaction hashes
      const hashes = [...new Set(transaction.vin.map((val) => val.txid))];
      const transactions = await Promise.all(
        hashes.map((hash) => this.decodeTransaction(hash, false))
      );
      const transactionMap = new Map<string, ElectrumRawTransaction>();
      transactions.forEach((val) => transactionMap.set(val.hash, val));

      transaction.vin.forEach((input) => {
        const output = transactionMap
          .get(input.txid)!
          .vout.find((val) => val.n === input.vout)!;
        input.address = output.scriptPubKey.addresses[0];
        input.value = output.value;
        input.tokenData = output.tokenData;
      });
    }

    return transaction;
  }

  public mapToElectrumRawTransaction(
    transaction: LibAuthTransaction,
    txHash: string,
    txHex: string
  ): ElectrumRawTransaction {
    let result: ElectrumRawTransaction = {} as any;

    result.vin = transaction.inputs.map((input): ElectrumRawTransactionVin => {
      return {
        scriptSig: {
          hex: binToHex(input.unlockingBytecode),
        } as ElectrumRawTransactionVinScriptSig,
        sequence: input.sequenceNumber,
        txid: binToHex(input.outpointTransactionHash),
        vout: input.outpointIndex,
      };
    });

    result.vout = transaction.outputs.map(
      (output, index): ElectrumRawTransactionVout => {
        return {
          n: index,
          scriptPubKey: {
            addresses: [
              isPayToPublicKey(output.lockingBytecode)
                ? publicKeyToP2pkhCashAddress({
                    publicKey: lockingBytecodeToAddressContents(
                      output.lockingBytecode
                    ).payload,
                    prefix: prefixFromNetworkMap[this.network],
                  })
                : assertSuccess(
                    lockingBytecodeToCashAddress({
                      bytecode: output.lockingBytecode,
                      prefix: prefixFromNetworkMap[this.network],
                    })
                  ).address,
            ],
            hex: binToHex(output.lockingBytecode),
          } as ElectrumRawTransactionVoutScriptPubKey,
          value: Number(output.valueSatoshis) / bchParam.subUnits,
        };
      }
    );

    result.locktime = transaction.locktime;
    result.version = transaction.version;
    result.hash = txHash;
    result.hex = txHex;
    result.txid = txHash;
    result.size = txHex.length / 2;

    return result;
  }

  public static async decodeTransaction(
    transactionHashOrHex: string,
    loadInputValues: boolean = false,
    network?: NetworkType
  ): Promise<ElectrumRawTransaction> {
    return new this(network).decodeTransaction(
      transactionHashOrHex,
      loadInputValues
    );
  }
}
