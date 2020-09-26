// Unstable?
import {
  authenticationTemplateP2pkhNonHd,
  authenticationTemplateToCompilerBCH,
  bigIntToBinUint64LE,
  cashAddressToLockingBytecode,
  Compiler,
  encodeTransaction,
  generateTransaction,
  validateAuthenticationTemplate,
  TransactionContextCommon,
  AnyCompilationEnvironment,
  AuthenticationProgramStateBCH,
} from "@bitauth/libauth";
import { Utxo } from "../interface";

import { SendRequest } from "../wallet/model";
import { sumSendRequestAmounts } from "../util/sumSendRequestAmounts";
import { sumUtxoValue } from "../util/sumUtxoValue";

// Build a transaction for a p2pkh transaction for a non HD wallet
export async function buildP2pkhNonHdTransaction(
  inputs: Utxo[],
  outputs: SendRequest[],
  signingKey: Uint8Array,
  fee: number = 0,
  discardChange = false
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

  // Get the change locking bytecode
  let changeLockingBytecode = compiler.generateBytecode("lock", {
    keys: { privateKeys: { key: signingKey } },
  });
  if (!changeLockingBytecode.success) {
    throw new Error(changeLockingBytecode.toString());
  }

  try {
    let lockedOutputs = prepareOutputs(outputs);

    if (discardChange !== true) {
      const changeAmount =
        BigInt(inputAmount) - BigInt(sendAmount) - BigInt(fee);
      lockedOutputs.push({
        lockingBytecode: changeLockingBytecode.bytecode,
        satoshis: bigIntToBinUint64LE(BigInt(changeAmount)),
      });
    }

    let signedInputs = prepareInputs(inputs, compiler, signingKey);
    const result = generateTransaction({
      inputs: signedInputs,
      locktime: 0,
      outputs: [...lockedOutputs],
      version: 2,
    });
    return result;
  } catch (error) {
    throw Error(error.toString());
  }
}

export function prepareInputs(
  inputs: Utxo[],
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
        satoshis: bigIntToBinUint64LE(BigInt(utxoTxnValue)),
        script: "unlock",
      },
    };
    signedInputs.push(newInput);
  }
  return signedInputs;
}

export function prepareOutputs(outputs: SendRequest[]) {
  let lockedOutputs: any[] = [];
  for (const output of outputs) {
    // TODO move this to transaction/Wif
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
    let lockedOutput = {
      lockingBytecode: outputLockingBytecode.bytecode,
      satoshis: bigIntToBinUint64LE(BigInt(output.amount.inSatoshi())),
    };
    lockedOutputs.push(lockedOutput);
  }
  return lockedOutputs;
}

export async function getSuitableUtxos(
  unspentOutputs: Utxo[],
  amountRequired: BigInt | undefined,
  bestHeight: number
) {
  let suitableUtxos: Utxo[] = [];
  let amountAvailable = 0n;
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
  // If the amount needed is met, or no amount is given, return
  if (typeof amountRequired === "undefined") {
    return suitableUtxos;
  } else if (amountAvailable < amountRequired) {
    throw Error(
      `Amount required was not met, ${amountRequired} needed, ${amountAvailable} available`
    );
  } else {
    return suitableUtxos;
  }
}

export async function getFeeAmount({
  utxos,
  sendRequests,
  privateKey,
}: {
  utxos: Utxo[];
  sendRequests: SendRequest[];
  privateKey: Uint8Array;
}) {
  // build transaction
  if (utxos) {
    // Build the transaction to get the approximate size
    let draftTransaction = await buildEncodedTransaction(
      utxos,
      sendRequests,
      privateKey,
      888
    );
    return draftTransaction.length * 2;
  } else {
    throw Error(
      "The available inputs in the wallet cannot satisfy this send request"
    );
  }
}

// Build encoded transaction
export async function buildEncodedTransaction(
  fundingUtxos: Utxo[],
  sendRequests: SendRequest[],
  privateKey: Uint8Array,
  fee: number = 0,
  discardChange = false
) {
  let txn = await buildP2pkhNonHdTransaction(
    fundingUtxos,
    sendRequests,
    privateKey,
    fee,
    discardChange
  );
  // submit transaction
  if (txn.success) {
    return encodeTransaction(txn.transaction);
  } else {
    throw Error("Error building transaction with fee");
  }
}
