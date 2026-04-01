import {
  assertSuccess,
  binToHex,
  decodeTransaction as decodeTransactionLibAuth,
  hexToBin,
  isPayToPublicKey,
  Transaction as LibAuthTransaction,
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
import { getTransactionHash } from "../util/transaction.js";

export { getTransactionHash };

function mapToElectrumRawTransaction(
  transaction: LibAuthTransaction,
  txHash: string,
  txHex: string,
  network: NetworkType,
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
      }),
    ),
    vout: transaction.outputs.map(
      (output, index): ElectrumRawTransactionVout => ({
        n: index,
        scriptPubKey: {
          addresses: [
            isPayToPublicKey(output.lockingBytecode)
              ? publicKeyToP2pkhCashAddress({
                  publicKey: lockingBytecodeToAddressContents(
                    output.lockingBytecode,
                  ).payload,
                  prefix: prefixFromNetworkMap[network],
                }).address
              : assertSuccess(
                  lockingBytecodeToCashAddress({
                    bytecode: output.lockingBytecode,
                    prefix: prefixFromNetworkMap[network],
                  }),
                ).address,
          ],
          asm: "",
          hex: binToHex(output.lockingBytecode),
          reqSigs: 1,
          type: "",
        },
        value: Number(output.valueSatoshis) / Number(bchParam.subUnits),
      }),
    ),
  };
}

export async function decodeTransaction(
  transactionHashOrHex: string,
  loadInputValues: true,
  network?: NetworkType,
): Promise<ElectrumRawTransactionWithInputValues>;
export async function decodeTransaction(
  transactionHashOrHex: string,
  loadInputValues?: false,
  network?: NetworkType,
): Promise<ElectrumRawTransaction>;
export async function decodeTransaction(
  transactionHashOrHex: string,
  loadInputValues: boolean = false,
  network: NetworkType = NetworkType.Mainnet,
): Promise<ElectrumRawTransaction | ElectrumRawTransactionWithInputValues> {
  const provider = getNetworkProvider(network);
  let transactionHex: string;
  let transactionBin: Uint8Array;
  let txHash: string;

  if (transactionHashOrHex.length > 64) {
    txHash = await getTransactionHash(transactionHashOrHex);
    transactionBin = hexToBin(transactionHashOrHex);
    transactionHex = transactionHashOrHex;
  } else {
    txHash = transactionHashOrHex;
    transactionHex = await provider.getRawTransaction(txHash);
    transactionBin = hexToBin(transactionHex);
  }

  const result = decodeTransactionLibAuth(transactionBin);
  if (typeof result === "string") {
    throw Error(result);
  }

  const transaction = mapToElectrumRawTransaction(
    result,
    txHash,
    transactionHex,
    network,
  );

  if (loadInputValues) {
    const hashes = [...new Set(transaction.vin.map((val) => val.txid))];
    const transactions = await Promise.all(
      hashes.map((hash) => decodeTransaction(hash, false, network)),
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
