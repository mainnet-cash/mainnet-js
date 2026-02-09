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
  ElectrumRawTransactionVinWithValues,
  ElectrumRawTransactionVout,
  ElectrumRawTransactionWithInputValues,
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
    loadInputValues: true
  ): Promise<ElectrumRawTransactionWithInputValues>;
  public async decodeTransaction(
    transactionHashOrHex: string,
    loadInputValues?: false
  ): Promise<ElectrumRawTransaction>;
  public async decodeTransaction(
    transactionHashOrHex: string,
    loadInputValues: boolean = false
  ): Promise<ElectrumRawTransaction | ElectrumRawTransactionWithInputValues> {
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

      const enrichedVin: ElectrumRawTransactionVinWithValues[] =
        transaction.vin.map((input) => {
          const output = transactionMap
            .get(input.txid)!
            .vout.find((val) => val.n === input.vout)!;
          return { ...input, ...output };
        });

      return { ...transaction, vin: enrichedVin };
    }

    return transaction;
  }

  public mapToElectrumRawTransaction(
    transaction: LibAuthTransaction,
    txHash: string,
    txHex: string
  ): ElectrumRawTransaction {
    return {
      blockhash: "",
      blocktime: 0,
      confirmations: 0,
      time: 0,
      hash: txHash,
      hex: txHex,
      txid: txHash,
      locktime: transaction.locktime,
      version: transaction.version,
      size: txHex.length / 2,
      vin: transaction.inputs.map(
        (input): ElectrumRawTransactionVin => ({
          scriptSig: {
            asm: "",
            hex: binToHex(input.unlockingBytecode),
          },
          sequence: input.sequenceNumber,
          txid: binToHex(input.outpointTransactionHash),
          vout: input.outpointIndex,
        })
      ),
      vout: transaction.outputs.map(
        (output, index): ElectrumRawTransactionVout => ({
          n: index,
          scriptPubKey: {
            addresses: [
              isPayToPublicKey(output.lockingBytecode)
                ? publicKeyToP2pkhCashAddress({
                    publicKey: lockingBytecodeToAddressContents(
                      output.lockingBytecode
                    ).payload,
                    prefix: prefixFromNetworkMap[this.network],
                  }).address
                : assertSuccess(
                    lockingBytecodeToCashAddress({
                      bytecode: output.lockingBytecode,
                      prefix: prefixFromNetworkMap[this.network],
                    })
                  ).address,
            ],
            asm: "",
            hex: binToHex(output.lockingBytecode),
            reqSigs: 1,
            type: "",
          },
          value: Number(output.valueSatoshis) / Number(bchParam.subUnits),
        })
      ),
    };
  }

  public static async decodeTransaction(
    transactionHashOrHex: string,
    loadInputValues: true,
    network?: NetworkType
  ): Promise<ElectrumRawTransactionWithInputValues>;
  public static async decodeTransaction(
    transactionHashOrHex: string,
    loadInputValues?: false,
    network?: NetworkType
  ): Promise<ElectrumRawTransaction>;
  public static async decodeTransaction(
    transactionHashOrHex: string,
    loadInputValues: boolean = false,
    network?: NetworkType
  ): Promise<ElectrumRawTransaction | ElectrumRawTransactionWithInputValues> {
    if (loadInputValues) {
      return new this(network).decodeTransaction(transactionHashOrHex, true);
    }
    return new this(network).decodeTransaction(transactionHashOrHex);
  }
}
