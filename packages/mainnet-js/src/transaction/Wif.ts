// Unstable?
import {
  authenticationTemplateP2pkhNonHd,
  authenticationTemplateToCompilerBCH,
  bigIntToBinUint64LEClamped,
  cashAddressToLockingBytecode,
  Compiler,
  encodeTransaction,
  generateTransaction,
  validateAuthenticationTemplate,
  TransactionContextCommon,
  AnyCompilationEnvironment,
  AuthenticationProgramStateBCH,
} from "@bitauth/libauth";
import { UtxoI } from "../interface";
import { allocateFee } from "./allocateFee";

import { DUST_UTXO_THRESHOLD } from "../constant";
import { OpReturnData, SendRequest } from "../wallet/model";
import { amountInSatoshi } from "../util/amountInSatoshi";
import { sumSendRequestAmounts } from "../util/sumSendRequestAmounts";
import { sumUtxoValue } from "../util/sumUtxoValue";
import { FeePaidByEnum } from "../wallet/enum";

// Build a transaction for a p2pkh transaction for a non HD wallet
export async function buildP2pkhNonHdTransaction(
  inputs: UtxoI[],
  outputs: Array<SendRequest | OpReturnData>,
  signingKey: Uint8Array,
  fee: number = 0,
  discardChange = false,
  slpOutputs: any[] = [],
  feePaidBy: FeePaidByEnum = FeePaidByEnum.change,
  changeAddress: string = ""
) {
  if (!signingKey) {
    throw new Error("Missing signing key when building transaction");
  }

  const template = validateAuthenticationTemplate(
    authenticationTemplateP2pkhNonHd
  );
  if (typeof template === "string") {
    throw new Error("Transaction template error");
  }

  const compiler = await authenticationTemplateToCompilerBCH(template);
  const inputAmount = await sumUtxoValue(inputs);

  const sendAmount = await sumSendRequestAmounts(outputs);

  try {
    const changeAmount = BigInt(inputAmount) - BigInt(sendAmount) - BigInt(fee);

    outputs = allocateFee(outputs, fee, feePaidBy, changeAmount);

    let lockedOutputs = await prepareOutputs(outputs);

    if (discardChange !== true) {
      if (changeAmount > DUST_UTXO_THRESHOLD) {
        let changeLockingBytecode;
        if (changeAddress) {
          changeLockingBytecode = cashAddressToLockingBytecode(changeAddress);
        } else {
          // Get the change locking bytecode
          changeLockingBytecode = compiler.generateBytecode("lock", {
            keys: { privateKeys: { key: signingKey } },
          });
        }
        if (typeof changeLockingBytecode === "string") {
          throw new Error(changeLockingBytecode);
        }
        lockedOutputs.push({
          lockingBytecode: changeLockingBytecode.bytecode,
          satoshis: bigIntToBinUint64LEClamped(BigInt(changeAmount)),
        });
      }
    }

    let signedInputs = prepareInputs(inputs, compiler, signingKey);
    const result = generateTransaction({
      inputs: signedInputs,
      locktime: 0,
      outputs: [...slpOutputs, ...lockedOutputs],
      version: 2,
    });
    return result;
  } catch (error: any) {
    throw Error(error.toString());
  }
}

export function prepareInputs(
  inputs: UtxoI[],
  compiler: Compiler<
    TransactionContextCommon,
    AnyCompilationEnvironment<TransactionContextCommon>,
    AuthenticationProgramStateBCH
  >,
  signingKey: Uint8Array
) {
  let signedInputs: any[] = [];
  for (const i of inputs) {
    const utxoTxnValue = i.satoshis;
    const utxoIndex = i.vout;
    // slice will create a clone of the array
    let utxoOutpointTransactionHash = new Uint8Array(
      i.txid.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    // reverse the cloned copy
    // utxoOutpointTransactionHash.reverse();
    if (!utxoOutpointTransactionHash || utxoIndex === undefined) {
      throw new Error("Missing unspent outpoint when building transaction");
    }
    let newInput = {
      outpointIndex: utxoIndex,
      outpointTransactionHash: utxoOutpointTransactionHash,
      sequenceNumber: 0,
      unlockingBytecode: {
        compiler,
        data: {
          keys: { privateKeys: { key: signingKey } },
        },
        satoshis: bigIntToBinUint64LEClamped(BigInt(utxoTxnValue)),
        script: "unlock",
      },
    };
    signedInputs.push(newInput);
  }
  return signedInputs;
}

/**
 * prepareOutputs - create outputs for a transaction from a list of send requests
 *
 * a wrapper function
 *
 * @returns A promise to a list of unspent outputs
 */
export async function prepareOutputs(
  outputs: Array<SendRequest | OpReturnData>
) {
  let lockedOutputs: any[] = [];
  for (const output of outputs) {
    if (output instanceof OpReturnData) {
      lockedOutputs.push(prepareOpReturnOutput(output));
      continue;
    }

    let outputLockingBytecode = cashAddressToLockingBytecode(output.cashaddr);
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

    let sendAmount = await amountInSatoshi(output.value, output.unit);
    if (sendAmount % 1 !== 0) {
      throw Error(
        `Cannot send ${sendAmount} satoshis, (fractional sats do not exist, yet), please use an integer number.`
      );
    }
    let lockedOutput = {
      lockingBytecode: outputLockingBytecode.bytecode,
      satoshis: bigIntToBinUint64LEClamped(BigInt(sendAmount)),
    };
    lockedOutputs.push(lockedOutput);
  }
  return lockedOutputs;
}

/**
 * prepareOpReturnOutput - create an output for OP_RETURN data
 *
 * @returns A promise to a list of unspent outputs
 */
export function prepareOpReturnOutput(request: OpReturnData) {
  return {
    lockingBytecode: request.buffer,
    satoshis: bigIntToBinUint64LEClamped(BigInt(0)),
  };
}

/**
 * getSuitableUtxos - Filter a list of unspent transaction outputs to the minimum needed to complete a transaction
 *
 * a intermediate function
 *
 * @param unspentOutputs  An unfiltered list of available unspent transaction outputs
 *
 * @returns A promise to a list of unspent outputs
 */
export async function getSuitableUtxos(
  unspentOutputs: UtxoI[],
  amountRequired: BigInt | undefined,
  bestHeight: number,
  feePaidBy: FeePaidByEnum
): Promise<UtxoI[]> {
  let suitableUtxos: UtxoI[] = [];
  let amountAvailable = BigInt(0);
  for (const u of unspentOutputs) {
    if (u.coinbase && u.height && bestHeight) {
      let age = bestHeight - u.height;
      if (age > 100) {
        suitableUtxos.push(u);
        amountAvailable += BigInt(u.satoshis);
      }
    } else {
      suitableUtxos.push(u);
      amountAvailable += BigInt(u.satoshis);
    }
    // if amountRequired is not given, assume it is a max spend request, skip this condition
    if (amountRequired && amountAvailable > amountRequired) {
      break;
    }
  }

  // if the fee is split with a feePaidBy option, skip checking change.
  if (feePaidBy && feePaidBy != FeePaidByEnum.change) {
    return suitableUtxos;
  }

  // If the amount needed is met, or no amount is given, return
  if (typeof amountRequired === "undefined") {
    return suitableUtxos;
  } else if (amountAvailable < amountRequired) {
    let e = Error(
      `Amount required was not met, ${amountRequired} satoshis needed, ${amountAvailable} satoshis available`
    );
    e["data"] = {
      required: amountRequired,
      available: amountAvailable,
    };
    throw e;
  } else {
    return suitableUtxos;
  }
}

export async function getFeeAmount({
  utxos,
  sendRequests,
  privateKey,
  relayFeePerByteInSatoshi,
  slpOutputs,
  feePaidBy,
}: {
  utxos: UtxoI[];
  sendRequests: Array<SendRequest | OpReturnData>;
  privateKey: Uint8Array;
  relayFeePerByteInSatoshi: number;
  slpOutputs: any[];
  feePaidBy: FeePaidByEnum;
}) {
  // build transaction
  if (utxos) {
    // Build the transaction to get the approximate size
    let draftTransaction = await buildEncodedTransaction(
      utxos,
      sendRequests,
      privateKey,
      0, //DUST_UTXO_THRESHOLD
      false,
      slpOutputs,
      feePaidBy
    );

    return draftTransaction.length * relayFeePerByteInSatoshi + 2;
  } else {
    throw Error(
      "The available inputs in the wallet cannot satisfy this send request"
    );
  }
}

// Build encoded transaction
export async function buildEncodedTransaction(
  fundingUtxos: UtxoI[],
  sendRequests: Array<SendRequest | OpReturnData>,
  privateKey: Uint8Array,
  fee: number = 0,
  discardChange = false,
  slpOutputs: any[] = [],
  feePaidBy: FeePaidByEnum = FeePaidByEnum.change,
  changeAddress: string = ""
) {
  let txn = await buildP2pkhNonHdTransaction(
    fundingUtxos,
    sendRequests,
    privateKey,
    fee,
    discardChange,
    slpOutputs,
    feePaidBy,
    changeAddress
  );
  // submit transaction
  if (txn.success) {
    return encodeTransaction(txn.transaction);
  } else {
    throw Error("Error building transaction with fee");
  }
}
