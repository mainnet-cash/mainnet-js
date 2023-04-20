// Unstable?
import {
  authenticationTemplateP2pkhNonHd,
  authenticationTemplateToCompilerBCH,
  cashAddressToLockingBytecode,
  Compiler,
  encodeTransaction,
  generateTransaction,
  importAuthenticationTemplate,
  AnyCompilerConfiguration,
  AuthenticationProgramStateCommon,
  CompilationContextBCH,
  Output,
  hexToBin,
  verifyTransactionTokens,
} from "@bitauth/libauth";
import { NFTCapability, TokenI, UtxoI } from "../interface.js";
import { allocateFee } from "./allocateFee.js";

import { DUST_UTXO_THRESHOLD } from "../constant.js";
import {
  OpReturnData,
  SendRequest,
  SendRequestType,
  TokenSendRequest,
} from "../wallet/model.js";
import { amountInSatoshi } from "../util/amountInSatoshi.js";
import { sumSendRequestAmounts } from "../util/sumSendRequestAmounts.js";
import { sumUtxoValue } from "../util/sumUtxoValue.js";
import { FeePaidByEnum } from "../wallet/enum.js";

// Build a transaction for a p2pkh transaction for a non HD wallet
export async function buildP2pkhNonHdTransaction({
  inputs,
  outputs,
  signingKey,
  sourceAddress,
  fee = 0,
  discardChange = false,
  slpOutputs = [],
  feePaidBy = FeePaidByEnum.change,
  changeAddress = ""
} : {
  inputs: UtxoI[],
  outputs: Array<SendRequest | TokenSendRequest | OpReturnData>,
  signingKey: Uint8Array,
  sourceAddress: string,
  fee?: number,
  discardChange?: boolean,
  slpOutputs?: Output[],
  feePaidBy?: FeePaidByEnum,
  changeAddress?: string,
}) {
  if (!signingKey) {
    throw new Error("Missing signing key when building transaction");
  }

  const template = importAuthenticationTemplate(
    authenticationTemplateP2pkhNonHd
  );
  if (typeof template === "string") {
    throw new Error("Transaction template error");
  }

  const compiler = await authenticationTemplateToCompilerBCH(template);
  const inputAmount = await sumUtxoValue(inputs);

  const sendAmount = await sumSendRequestAmounts(outputs);

  const changeAmount = BigInt(inputAmount) - BigInt(sendAmount) - BigInt(fee);

  outputs = allocateFee(outputs, fee, feePaidBy, changeAmount);

  const lockedOutputs = await prepareOutputs(outputs);

  if (discardChange !== true) {
    if (changeAmount > DUST_UTXO_THRESHOLD) {
      let changeLockingBytecode;
      if (changeAddress) {
        changeLockingBytecode = cashAddressToLockingBytecode(changeAddress);
      } else {
        // Get the change locking bytecode
        changeLockingBytecode = compiler.generateBytecode({
          scriptId: "lock",
          data: {
            keys: { privateKeys: { key: signingKey } },
          },
        });
      }
      if (typeof changeLockingBytecode === "string") {
        throw new Error(changeLockingBytecode);
      }
      lockedOutputs.push({
        lockingBytecode: changeLockingBytecode.bytecode,
        valueSatoshis: BigInt(changeAmount),
      });
    }
  }

  const { preparedInputs, sourceOutputs } = prepareInputs({inputs, compiler, signingKey, sourceAddress});
  const result = generateTransaction({
    inputs: preparedInputs,
    locktime: 0,
    outputs: [...slpOutputs, ...lockedOutputs],
    version: 2,
  });

  if (!result.success) {
    throw Error("Error building transaction with fee");
  }

  const tokenValidationResult = verifyTransactionTokens(
    result.transaction,
    sourceOutputs
  );
  if (tokenValidationResult !== true && fee > 0) {
    throw tokenValidationResult;
  }

  return { transaction: result.transaction, sourceOutputs: sourceOutputs };
}

export function prepareInputs({
  inputs,
  compiler,
  signingKey,
  sourceAddress
}: {
  inputs: UtxoI[],
  compiler: Compiler<
    CompilationContextBCH,
    AnyCompilerConfiguration<CompilationContextBCH>,
    AuthenticationProgramStateCommon
  >,
  signingKey: Uint8Array,
  sourceAddress: string,
}) {
  const preparedInputs: any[] = [];
  const sourceOutputs: any[] = [];
  for (const i of inputs) {
    const utxoTxnValue = i.satoshis;
    const utxoIndex = i.vout;
    // slice will create a clone of the array
    const utxoOutpointTransactionHash = new Uint8Array(
      i.txid.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    // reverse the cloned copy
    // utxoOutpointTransactionHash.reverse();
    if (!utxoOutpointTransactionHash || utxoIndex === undefined) {
      throw new Error("Missing unspent outpoint when building transaction");
    }

    const libAuthToken = i.token && {
      amount: BigInt(i.token.amount),
      category: hexToBin(i.token.tokenId),
      nft:
        i.token.capability !== undefined || i.token.commitment !== undefined
          ? {
              capability: i.token.capability,
              commitment: i.token.commitment !== undefined && hexToBin(i.token.commitment!),
            }
          : undefined,
    };
    const newInput = signingKey?.length ? {
      outpointIndex: utxoIndex,
      outpointTransactionHash: utxoOutpointTransactionHash,
      sequenceNumber: 0,
      unlockingBytecode: {
        compiler,
        data: {
          keys: { privateKeys: { key: signingKey } },
        },
        valueSatoshis: BigInt(utxoTxnValue),
        script: "unlock",
        token: libAuthToken,
      },
    } : {
      outpointIndex: utxoIndex,
      outpointTransactionHash: utxoOutpointTransactionHash,
      sequenceNumber: 0,
      unlockingBytecode: Uint8Array.from([]),
    };

    preparedInputs.push(newInput);
    sourceOutputs.push({
      outpointIndex: utxoIndex,
      outpointTransactionHash: utxoOutpointTransactionHash,
      sequenceNumber: 0,
      unlockingBytecode: Uint8Array.from([]),

      // additional info for sourceOutputs
      lockingBytecode: cashAddressToLockingBytecode(sourceAddress),
      valueSatoshis: BigInt(utxoTxnValue),
      token: libAuthToken,
    })
  }
  return { preparedInputs, sourceOutputs };
}

/**
 * prepareOutputs - create outputs for a transaction from a list of send requests
 *
 * a wrapper function
 *
 * @returns A promise to a list of unspent outputs
 */
export async function prepareOutputs(
  outputs: Array<SendRequest | TokenSendRequest | OpReturnData>,
) {
  const lockedOutputs: Output[] = [];
  for (const output of outputs) {
    if (output instanceof TokenSendRequest) {
      lockedOutputs.push(prepareTokenOutputs(output));
      continue;
    }

    if (output instanceof OpReturnData) {
      lockedOutputs.push(prepareOpReturnOutput(output));
      continue;
    }

    const outputLockingBytecode = cashAddressToLockingBytecode(output.cashaddr);
    if (typeof outputLockingBytecode === "string")
      throw new Error(outputLockingBytecode);

    const sendAmount = await amountInSatoshi(output.value, output.unit);
    if (sendAmount % 1 !== 0) {
      throw Error(
        `Cannot send ${sendAmount} satoshis, (fractional sats do not exist, yet), please use an integer number.`
      );
    }
    const lockedOutput: Output = {
      lockingBytecode: outputLockingBytecode.bytecode,
      valueSatoshis: BigInt(sendAmount),
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
export function prepareOpReturnOutput(request: OpReturnData): Output {
  return {
    lockingBytecode: request.buffer,
    valueSatoshis: BigInt(0),
  };
}

/**
 * prepareOpReturnOutput - create an output for token data
 *
 * @returns A libauth Output
 */
export function prepareTokenOutputs(
  request: TokenSendRequest,
): Output {
  const token: TokenI = request;
  const outputLockingBytecode = cashAddressToLockingBytecode(request.cashaddr);
  if (typeof outputLockingBytecode === "string")
    throw new Error(outputLockingBytecode);

  const libAuthToken = {
    amount: BigInt(token.amount),
    category: hexToBin(token.tokenId),
    nft:
      token.capability !== undefined || token.commitment !== undefined
        ? {
            capability: token.capability,
            commitment: token.commitment !== undefined && hexToBin(token.commitment!),
          }
        : undefined,
  };

  return {
    lockingBytecode: outputLockingBytecode.bytecode,
    valueSatoshis: BigInt(request.value || 1000),
    token: libAuthToken,
  } as Output;
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
  inputs: UtxoI[],
  amountRequired: BigInt | undefined,
  bestHeight: number,
  feePaidBy: FeePaidByEnum,
  requests: SendRequestType[],
  ensureUtxos: UtxoI[] = [],
  tokenOperation: "send" | "genesis" | "mint" | "burn" = "send"
): Promise<UtxoI[]> {
  const suitableUtxos: UtxoI[] = [...ensureUtxos];
  let amountAvailable = BigInt(0);
  const tokenRequests = requests.filter(
    (val) => val instanceof TokenSendRequest
  ) as TokenSendRequest[];

  const availableInputs = inputs.slice();

  // find matching utxos for token transfers
  if (tokenOperation === "send") {
    for (const request of tokenRequests) {
      const tokenInputs = availableInputs.filter(val => val.token?.tokenId === request.tokenId);
      const sameCommitmentTokens = [...suitableUtxos, ...tokenInputs].filter(val => val.token?.capability === request.capability && val.token?.commitment === request.commitment);
      if (sameCommitmentTokens.length) {
        const input = sameCommitmentTokens[0];
        const index = availableInputs.indexOf(input);
        if (index !== -1) {
          suitableUtxos.push(input);
          availableInputs.splice(index, 1);
          amountAvailable += BigInt(input.satoshis);
        }

        continue;
      }

      if (request.capability === NFTCapability.minting || request.capability === NFTCapability.mutable) {
        const changeCommitmentTokens = [...suitableUtxos, ...tokenInputs].filter(val => val.token?.capability === request.capability);
        if (changeCommitmentTokens.length) {
          const input = changeCommitmentTokens[0];
          const index = availableInputs.indexOf(input);
          if (index !== -1) {
            suitableUtxos.push(input);
            availableInputs.splice(index, 1);
            amountAvailable += BigInt(input.satoshis);
          }
          continue;
        }
      }
      throw Error(`No suitable token utxos available to send token with id "${request.tokenId}", capability "${request.capability}", commitment "${request.commitment}"`);
    }
  }
  // find plain bch outputs
  for (const u of availableInputs) {
    if (u.token) {
      continue;
    }

    if (u.coinbase && u.height && bestHeight) {
      const age = bestHeight - u.height;
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

  const addEnsured = (suitableUtxos) => {
    return [...ensureUtxos, ...suitableUtxos].filter((val, index, array) => array.findIndex(other => other.txid === val.txid && other.vout === val.vout) === index);
  };

  // if the fee is split with a feePaidBy option, skip checking change.
  if (feePaidBy && feePaidBy != FeePaidByEnum.change) {
    return addEnsured(suitableUtxos);
  }

  // If the amount needed is met, or no amount is given, return
  if (typeof amountRequired === "undefined") {
    return addEnsured(suitableUtxos);
  } else if (amountAvailable < amountRequired) {
    const e = Error(
      `Amount required was not met, ${amountRequired} satoshis needed, ${amountAvailable} satoshis available`
    );
    e["data"] = {
      required: amountRequired,
      available: amountAvailable,
    };
    throw e;
  } else {
    return addEnsured(suitableUtxos);
  }
}

export async function getFeeAmount({
  utxos,
  sendRequests,
  privateKey,
  sourceAddress,
  relayFeePerByteInSatoshi,
  slpOutputs,
  feePaidBy,
  discardChange,
}: {
  utxos: UtxoI[];
  sendRequests: Array<SendRequest | TokenSendRequest | OpReturnData>;
  privateKey: Uint8Array;
  sourceAddress: string;
  relayFeePerByteInSatoshi: number;
  slpOutputs: Output[];
  feePaidBy: FeePaidByEnum;
  discardChange?: boolean;
}) {
  // build transaction
  if (utxos) {
    // Build the transaction to get the approximate size
    const { encodedTransaction: draftTransaction } = await buildEncodedTransaction({
      inputs: utxos,
      outputs: sendRequests,
      signingKey: privateKey,
      sourceAddress,
      fee: 0, //DUST_UTXO_THRESHOLD
      discardChange: discardChange ?? false,
      slpOutputs,
      feePaidBy,
      changeAddress: "",
  });

    return draftTransaction.length * relayFeePerByteInSatoshi + 1;
  } else {
    throw Error(
      "The available inputs in the wallet cannot satisfy this send request"
    );
  }
}

// Build encoded transaction
export async function buildEncodedTransaction({
    inputs,
    outputs,
    signingKey,
    sourceAddress,
    fee = 0,
    discardChange = false,
    slpOutputs = [],
    feePaidBy = FeePaidByEnum.change,
    changeAddress = ""
  } : {
    inputs: UtxoI[],
    outputs: Array<SendRequest | TokenSendRequest | OpReturnData>,
    signingKey: Uint8Array,
    sourceAddress: string,
    fee?: number,
    discardChange?: boolean,
    slpOutputs?: Output[],
    feePaidBy?: FeePaidByEnum,
    changeAddress?: string,
  }
) {
  const { transaction, sourceOutputs } = await buildP2pkhNonHdTransaction({
    inputs,
    outputs,
    signingKey,
    sourceAddress,
    fee,
    discardChange,
    slpOutputs,
    feePaidBy,
    changeAddress
  });

  return { encodedTransaction: encodeTransaction(transaction), sourceOutputs };
}
