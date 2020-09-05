// Unstable?
import {
  authenticationTemplateP2pkhNonHd,
  authenticationTemplateToCompilerBCH,
  bigIntToBinUint64LE,
  cashAddressToLockingBytecode,
  Compiler,
  generateTransaction,
  validateAuthenticationTemplate,
  TransactionContextCommon,
  AnyCompilationEnvironment,
  AuthenticationProgramStateCommon,
  AuthenticationProgramStateBCH,
} from "@bitauth/libauth";

import { SendRequest } from "../wallet/Base";
import { UnspentOutput } from "grpc-bchrpc-node/pb/bchrpc_pb";

// Build a transaction for a p2pkh transaction for a non HD wallet
export async function buildP2pkhNonHdTransaction(
  inputs: UnspentOutput[],
  output: SendRequest,
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
  const amount = output.amount.inSatoshi();
  const changeAmount = (await getInputTotal(inputs)) - (amount as number) - fee;

  if (!signingKey) {
    throw new Error("Missing signing key when building transaction");
  }

  try {
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

    // Get the change locking bytecode
    let changeLockingBytecode = compiler.generateBytecode("lock", {
      keys: { privateKeys: { key: signingKey } },
    });
    if (!changeLockingBytecode.success) {
      throw new Error(changeLockingBytecode.toString());
    }
    let signedInputs = prepareInputs(inputs, compiler, signingKey);
    const result = generateTransaction({
      inputs: signedInputs,
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

function prepareInputs(
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
    const utxoIndex = i.getOutpoint()?.getIndex();
    // slice will create a clone of the array
    let utxoOutpointTransactionHash = i.getOutpoint()?.getHash_asU8().slice();
    // reverse the cloned copy
    utxoOutpointTransactionHash?.reverse();
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

function prepareOutputs() {}

export async function getSuitableUtxos(
  unspentOutputs: UnspentOutput[],
  amount: number,
  bestHeight: number
) {
  let suitableUtxos: UnspentOutput[] = [];
  let amountRequired = 0;
  for (const u of unspentOutputs) {
    if (u.getIsCoinbase() && bestHeight) {
      let age = bestHeight - u.getBlockHeight();
      if (age > 100) {
        suitableUtxos.push(u);
        amountRequired += u.getValue();
      }
    } else {
      suitableUtxos.push(u);
      amountRequired += u.getValue();
    }
    if (amountRequired > amount) {
      break;
    }
  }
  if (amountRequired > amount) {
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
