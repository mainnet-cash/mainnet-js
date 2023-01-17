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
  binToHex,
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
export async function buildP2pkhNonHdTransaction(
  inputs: UtxoI[],
  outputs: Array<SendRequest | TokenSendRequest | OpReturnData>,
  signingKey: Uint8Array,
  fee: number = 0,
  discardChange = false,
  slpOutputs: Output[] = [],
  feePaidBy: FeePaidByEnum = FeePaidByEnum.change,
  changeAddress: string = ""
) {
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

  let lockedOutputs = await prepareOutputs(outputs, inputs);

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

  let signedInputs = prepareInputs(inputs, compiler, signingKey);
  const result = generateTransaction({
    inputs: signedInputs,
    locktime: 0,
    outputs: [...slpOutputs, ...lockedOutputs],
    version: 2,
  });
  return result;
}

export function prepareInputs(
  inputs: UtxoI[],
  compiler: Compiler<
    CompilationContextBCH,
    AnyCompilerConfiguration<CompilationContextBCH>,
    AuthenticationProgramStateCommon
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

    const libAuthToken = i.token && {
      amount: BigInt(i.token.amount),
      category: hexToBin(i.token.tokenId),
      nft:
        i.token.capability || i.token.commitment
          ? {
              capability: i.token.capability,
              commitment: i.token.commitment && hexToBin(i.token.commitment!),
            }
          : undefined,
    };
    let newInput = {
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
  outputs: Array<SendRequest | TokenSendRequest | OpReturnData>,
  inputs: UtxoI[]
) {
  let lockedOutputs: Output[] = [];
  for (const output of outputs) {
    if (output instanceof TokenSendRequest) {
      lockedOutputs.push(prepareTokenOutputs(output, inputs));
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
  inputs: UtxoI[]
): Output {
  const token: TokenI = request;
  const isGenesis = !request.tokenId || (request as any)._isGenesis;
  let satValue = 0;
  if (isGenesis) {
    const genesisInputs = inputs.filter((val) => val.vout === 0);
    if (genesisInputs.length === 0) {
      throw new Error(
        "No suitable inputs with vout=0 available for new token genesis"
      );
    }
    token.tokenId = genesisInputs[0].txid;
    satValue = request.value || 1000;
    (request as any)._isGenesis = true;
  } else {
    const tokenInputs = inputs.filter(
      (val) => val.token?.tokenId === request.tokenId
    );
    if (!tokenInputs.length) {
      throw new Error(`No token utxos available to send ${request.tokenId}`);
    }
    if (!token.capability && tokenInputs[0].token?.capability) {
      token.capability = tokenInputs[0].token!.capability;
    }
    if (!token.commitment && tokenInputs[0].token?.commitment) {
      token.commitment = tokenInputs[0].token!.commitment;
    }

    if (
      tokenInputs[0].token?.capability === NFTCapability.none &&
      tokenInputs[0].token?.commitment !== token.commitment
    ) {
      throw new Error("Can not change the commitment of an immutable token");
    }

    satValue = request.value || tokenInputs[0].satoshis;
  }

  let outputLockingBytecode = cashAddressToLockingBytecode(request.cashaddr);
  if (typeof outputLockingBytecode === "string")
    throw new Error(outputLockingBytecode);

  const libAuthToken = {
    amount: BigInt(token.amount),
    category: hexToBin(token.tokenId),
    nft:
      token.capability || token.commitment
        ? {
            capability: token.capability,
            commitment: token.commitment && hexToBin(token.commitment!),
          }
        : undefined,
  };

  return {
    lockingBytecode: outputLockingBytecode.bytecode,
    valueSatoshis: BigInt(satValue),
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
  ensureUtxos: UtxoI[] = []
): Promise<UtxoI[]> {
  let suitableUtxos: UtxoI[] = [];
  let amountAvailable = BigInt(0);
  const tokenAmountsRequired: any[] = [];
  const tokenRequests = requests.filter(
    (val) => val instanceof TokenSendRequest
  ) as TokenSendRequest[];

  // if we do a new token genesis, we shall filter all token utxos out
  const isTokenGenesis = tokenRequests.some(
    (val) => !val.tokenId || (val as any)._isGenesis
  );
  const bchOnlyTransfer = tokenRequests.length === 0;
  let filteredInputs =
    isTokenGenesis || bchOnlyTransfer
      ? inputs.slice(0).filter((val) => !val.token)
      : inputs.slice();
  const tokenIds = tokenRequests
    .map((val) => val.tokenId)
    .filter((value, index, array) => array.indexOf(value) === index);
  for (let tokenId of tokenIds) {
    const requiredAmount = tokenRequests
      .map((val) => val.amount)
      .reduce((prev, cur) => prev + cur, 0);
    tokenAmountsRequired.push({ tokenId, requiredAmount });
  }

  // find suitable token inputs first
  for (const { tokenId, requiredAmount } of tokenAmountsRequired) {
    let tokenAmountAvailable = 0;
    for (const input of inputs) {
      if (input.token?.tokenId === tokenId) {
        suitableUtxos.push(input);
        const inputIndex = filteredInputs.indexOf(input);
        filteredInputs = filteredInputs.filter(
          (_, index) => inputIndex !== index
        );
        tokenAmountAvailable += input.token!.amount;
        amountAvailable += BigInt(input.satoshis);
        if (tokenAmountAvailable >= requiredAmount) {
          break;
        }
      }
    }
  }

  // find plain bch outputs
  for (const u of filteredInputs) {
    if (u.token) {
      continue;
    }

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

  const addEnsured = (suitableUtxos) => {
    return [...suitableUtxos, ...ensureUtxos].filter(
      (val, index, array) => array.indexOf(val) === index
    );
  };

  // if the fee is split with a feePaidBy option, skip checking change.
  if (feePaidBy && feePaidBy != FeePaidByEnum.change) {
    return addEnsured(suitableUtxos);
  }

  // If the amount needed is met, or no amount is given, return
  if (typeof amountRequired === "undefined") {
    return addEnsured(suitableUtxos);
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
    return addEnsured(suitableUtxos);
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
  sendRequests: Array<SendRequest | TokenSendRequest | OpReturnData>;
  privateKey: Uint8Array;
  relayFeePerByteInSatoshi: number;
  slpOutputs: Output[];
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

    return draftTransaction.length * relayFeePerByteInSatoshi + 1;
  } else {
    throw Error(
      "The available inputs in the wallet cannot satisfy this send request"
    );
  }
}

// Build encoded transaction
export async function buildEncodedTransaction(
  fundingUtxos: UtxoI[],
  sendRequests: Array<SendRequest | TokenSendRequest | OpReturnData>,
  privateKey: Uint8Array,
  fee: number = 0,
  discardChange = false,
  slpOutputs: Output[] = [],
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
