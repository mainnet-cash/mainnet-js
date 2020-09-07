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
import { UnspentOutput } from "grpc-bchrpc-node/pb/bchrpc_pb";

import { SendRequest } from "../wallet/Base";
import { getRandomInt } from "../util/randomInt";
import { sumSendRequestAmounts } from "../util/sumSendRequestAmounts";

// Build a transaction for a p2pkh transaction for a non HD wallet
export async function buildP2pkhNonHdTransaction(
  inputs: UnspentOutput[],
  outputs: SendRequest[],
  signingKey: Uint8Array,
  fee: number = 0
) {
  const template = validateAuthenticationTemplate(
    authenticationTemplateP2pkhNonHd
  );

  if (typeof template === "string") {
    throw new Error("Transaction template error");
  }

  const compiler = await authenticationTemplateToCompilerBCH(template);
  const inputAmount = await getInputTotal(inputs);
  const sendAmount = await sumSendRequestAmounts(outputs);
  const changeAmount = BigInt(inputAmount) - BigInt(sendAmount) - BigInt(fee);

  if (!signingKey) {
    throw new Error("Missing signing key when building transaction");
  }
  // Get the change locking bytecode
  let changeLockingBytecode = compiler.generateBytecode("lock", {
    keys: { privateKeys: { key: signingKey } },
  });
  if (!changeLockingBytecode.success) {
    throw new Error(changeLockingBytecode.toString());
  }
  try {
    let lockedOutputs = prepareOutputs(outputs);

    let signedInputs = prepareInputs(inputs, compiler, signingKey);
    const result = generateTransaction({
      inputs: signedInputs,
      locktime: 0,
      outputs: [
        ...lockedOutputs,
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

export function prepareInputs(
  inputs: UnspentOutput[],
  compiler: Compiler<
    TransactionContextCommon,
    AnyCompilationEnvironment<TransactionContextCommon>,
    AuthenticationProgramStateBCH
  >,
  signingKey: Uint8Array
) {
  let signedInputs: any[] = [];
  for (const i of inputs) {
    const utxoTxnValue = i.getValue();
    const utxoIndex = i.getOutpoint()!.getIndex();
    // slice will create a clone of the array
    let utxoOutpointTransactionHash = i.getOutpoint()!.getHash_asU8()!.slice();
    // reverse the cloned copy
    utxoOutpointTransactionHash.reverse();
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
  unspentOutputs: UnspentOutput[],
  amount: BigInt | undefined,
  bestHeight: number
) {
  let suitableUtxos: UnspentOutput[] = [];
  let amountRequired = 0n;

  for (const u of unspentOutputs) {
    if (u.getIsCoinbase() && bestHeight) {
      let age = bestHeight - u.getBlockHeight();
      if (age > 100) {
        suitableUtxos.push(u);
        amountRequired += BigInt(u.getValue());
      }
    } else {
      suitableUtxos.push(u);
      amountRequired += BigInt(u.getValue());
    }
    // if no amount is given, assume it is a max spend request, skip this condition
    if (typeof amount === "bigint" && amountRequired > amount) {
      break;
    }
  }
  // If the amount needed is met, or no amount is given, return
  if (typeof amount === "undefined" || amountRequired > amount) {
    return suitableUtxos;
  } else {
    throw Error("Could not find suitable outpoints for given amount");
  }
}

// Gets balance by summing value in all utxos in stats
export async function getInputTotal(inputs: UnspentOutput[]): Promise<number> {
  if (inputs) {
    const balanceArray: number[] = await Promise.all(
      inputs.map(async (o: UnspentOutput) => {
        return o.getValue();
      })
    );
    const balance = balanceArray.reduce((a: number, b: number) => a + b, 0);
    return balance;
  } else {
    return 0;
  }
}

export async function getFeeAmount({
  utxos,
  sendRequests,
  privateKey,
}: {
  utxos: UnspentOutput[];
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
      1000
    );
    return draftTransaction.length * 2 + getRandomInt(100);
  } else {
    throw Error(
      "The available inputs in the wallet cannot satisfy this send request"
    );
  }
}

// Build encoded transaction
export async function buildEncodedTransaction(
  fundingUtxos: UnspentOutput[],
  sendRequests: SendRequest[],
  privateKey: Uint8Array,
  fee: number = 0
) {
  let txn = await buildP2pkhNonHdTransaction(
    fundingUtxos,
    sendRequests,
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
