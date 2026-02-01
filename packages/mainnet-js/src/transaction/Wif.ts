import {
  walletTemplateP2pkhNonHd,
  cashAddressToLockingBytecode,
  Compiler,
  encodeTransaction,
  generateTransaction,
  importWalletTemplate,
  AnyCompilerConfiguration,
  AuthenticationProgramStateCommon,
  Output,
  hexToBin,
  verifyTransactionTokens,
  decodeTransaction,
  TransactionTemplateFixed,
  CompilationContextBch,
  walletTemplateToCompilerBch,
} from "@bitauth/libauth";
import { NFTCapability, TokenI, Utxo } from "../interface.js";
import { allocateFee } from "./allocateFee.js";

import { DUST_UTXO_THRESHOLD } from "../constant.js";
import {
  OpReturnData,
  SendRequest,
  SendRequestType,
  SourceOutput,
  TokenSendRequest,
} from "../wallet/model.js";
import { sumSendRequestAmounts } from "../util/sumSendRequestAmounts.js";
import { sumUtxoValue } from "../util/sumUtxoValue.js";
import { FeePaidByEnum } from "../wallet/enum.js";
import { WalletCache } from "../cache/walletCache.js";

export const placeholderPrivateKey =
  "0000000000000000000000000000000000000000000000000000000000000001";
export const placeholderPrivateKeyBin = hexToBin(placeholderPrivateKey);

// Build a transaction for a p2pkh transaction for a non HD wallet
export async function buildP2pkhNonHdTransaction({
  inputs,
  outputs,
  signingKey,
  fee = 0n,
  discardChange = false,
  feePaidBy = FeePaidByEnum.change,
  changeAddress = "",
  walletCache,
}: {
  inputs: Utxo[];
  outputs: Array<SendRequest | TokenSendRequest | OpReturnData>;
  signingKey?: Uint8Array;
  fee?: bigint;
  discardChange?: boolean;
  feePaidBy?: FeePaidByEnum;
  changeAddress?: string;
  walletCache?: WalletCache;
}) {
  if (!signingKey) {
    throw new Error("Missing signing key when building transaction");
  }

  const template = importWalletTemplate(walletTemplateP2pkhNonHd);
  if (typeof template === "string") {
    throw new Error("Transaction template error");
  }

  const compiler = walletTemplateToCompilerBch(template);
  const inputAmount = sumUtxoValue(inputs);

  const sendAmount = await sumSendRequestAmounts(outputs);

  const changeAmount = BigInt(inputAmount) - BigInt(sendAmount) - BigInt(fee);

  outputs = allocateFee(outputs, fee, feePaidBy, changeAmount);

  const lockedOutputs = await prepareOutputs(outputs);

  if (!changeAddress) {
    changeAddress = inputs[0].address;
  }

  if (discardChange !== true) {
    if (changeAmount > DUST_UTXO_THRESHOLD) {
      const changeLockingBytecode = cashAddressToLockingBytecode(changeAddress);
      if (typeof changeLockingBytecode === "string") {
        throw Error(changeLockingBytecode);
      }
      lockedOutputs.push({
        lockingBytecode: changeLockingBytecode.bytecode,
        valueSatoshis: BigInt(changeAmount),
      });
    }
  }

  const { preparedInputs, sourceOutputs } = prepareInputs({
    inputs,
    compiler,
    signingKey,
    walletCache,
  });
  const result = generateTransaction({
    inputs: preparedInputs,
    locktime: 0,
    outputs: lockedOutputs,
    version: 2,
  });

  if (!result.success) {
    throw Error("Error building transaction with fee");
  }

  const tokenValidationResult = verifyTransactionTokens(
    result.transaction,
    sourceOutputs,
    { maximumTokenCommitmentLength: 40 }
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
  walletCache,
}: {
  inputs: Utxo[];
  compiler: Compiler<
    CompilationContextBch,
    AnyCompilerConfiguration<CompilationContextBch>,
    AuthenticationProgramStateCommon
  >;
  signingKey: Uint8Array;
  walletCache?: WalletCache;
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
      category: hexToBin(i.token.category),
      nft:
        i.token.nft?.capability !== undefined ||
        i.token.nft?.commitment !== undefined
          ? {
              capability: i.token.nft?.capability,
              commitment:
                i.token.nft?.commitment !== undefined &&
                hexToBin(i.token.nft?.commitment!),
            }
          : undefined,
    };
    const key =
      walletCache?.get(i.address)?.privateKey ??
      (signingKey?.length ? signingKey : Uint8Array.from(Array(32)));
    const newInput = {
      outpointIndex: utxoIndex,
      outpointTransactionHash: utxoOutpointTransactionHash,
      sequenceNumber: 0,
      unlockingBytecode: {
        compiler,
        data: {
          keys: { privateKeys: { key: key } },
        },
        valueSatoshis: BigInt(utxoTxnValue),
        script: "unlock",
        token: libAuthToken,
      },
    };

    preparedInputs.push(newInput);

    const lockingBytecode = cashAddressToLockingBytecode(i.address);
    if (typeof lockingBytecode === "string") {
      throw lockingBytecode;
    }

    sourceOutputs.push({
      outpointIndex: utxoIndex,
      outpointTransactionHash: utxoOutpointTransactionHash,
      sequenceNumber: 0,
      unlockingBytecode: Uint8Array.from([]),

      // additional info for sourceOutputs
      lockingBytecode: lockingBytecode.bytecode,
      valueSatoshis: BigInt(utxoTxnValue),
      token: libAuthToken,
    });
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
  outputs: Array<SendRequest | TokenSendRequest | OpReturnData>
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

    const sendAmount = Number(output.value);
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
export function prepareTokenOutputs(request: TokenSendRequest): Output {
  const token: TokenI = request;
  const outputLockingBytecode = cashAddressToLockingBytecode(request.cashaddr);
  if (typeof outputLockingBytecode === "string")
    throw new Error(outputLockingBytecode);

  const libAuthToken = {
    amount: BigInt(token.amount),
    category: hexToBin(token.category),
    nft:
      token.nft?.capability !== undefined || token.nft?.commitment !== undefined
        ? {
            capability: token.nft?.capability,
            commitment:
              token.nft?.commitment !== undefined &&
              hexToBin(token.nft?.commitment!),
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
  inputs: Utxo[],
  amountRequired: bigint | undefined,
  bestHeight: number,
  feePaidBy: FeePaidByEnum,
  requests: SendRequestType[],
  ensureUtxos: Utxo[] = [],
  tokenOperation: "send" | "genesis" | "mint" | "burn" = "send"
): Promise<Utxo[]> {
  const utxoKey = (u: Utxo) => `${u.txid}:${u.vout}`;
  const selectedSet = new Set<string>();
  const suitableUtxos: Utxo[] = [];

  for (const u of ensureUtxos) {
    const key = utxoKey(u);
    if (!selectedSet.has(key)) {
      selectedSet.add(key);
      suitableUtxos.push(u);
    }
  }

  let amountAvailable = suitableUtxos.reduce(
    (sum, u) => sum + BigInt(u.satoshis),
    BigInt(0)
  );
  const tokenRequests = requests.filter(
    (val) => val instanceof TokenSendRequest
  ) as TokenSendRequest[];

  const usedIndices = new Set<number>();

  // Track how many times each selected UTXO has been "claimed" by a request
  const claimedUtxos = new Map<string, number>();

  // find matching utxos for token transfers
  if (tokenOperation === "send") {
    for (const request of tokenRequests) {
      // Search suitableUtxos then inputs sequentially to find matching tokens
      const matchCommitment = (val: Utxo) =>
        val.token?.category === request.category &&
        val.token?.nft?.capability === request.nft?.capability &&
        val.token?.nft?.commitment === request.nft?.commitment;

      // For NFTs (non-fungible), each request needs its own UTXO
      // For FT-only requests, a single UTXO can satisfy multiple requests
      const isFungibleOnly =
        request.nft?.capability === undefined &&
        request.nft?.commitment === undefined;

      // Check already-selected suitable utxos first (no need to re-add)
      let found = false;
      if (isFungibleOnly) {
        found = suitableUtxos.some(matchCommitment);
      } else {
        // For NFTs, find an unclaimed matching UTXO in suitableUtxos
        for (const val of suitableUtxos) {
          if (!matchCommitment(val)) continue;
          const key = utxoKey(val);
          const claims = claimedUtxos.get(key) || 0;
          if (claims === 0) {
            claimedUtxos.set(key, claims + 1);
            found = true;
            break;
          }
        }
      }

      if (!found) {
        // Search available inputs for same commitment match
        for (let i = 0; i < inputs.length; i++) {
          if (usedIndices.has(i)) continue;
          const val = inputs[i];
          if (val.token?.category !== request.category) continue;
          if (!matchCommitment(val)) continue;
          const key = utxoKey(val);
          if (selectedSet.has(key)) continue;

          selectedSet.add(key);
          suitableUtxos.push(val);
          usedIndices.add(i);
          amountAvailable += BigInt(val.satoshis);
          if (!isFungibleOnly) {
            claimedUtxos.set(key, 1);
          }
          found = true;
          break;
        }
      }

      if (found) continue;

      if (
        request.nft?.capability === NFTCapability.minting ||
        request.nft?.capability === NFTCapability.mutable
      ) {
        // Check already-selected suitable utxos first
        const alreadyHas = suitableUtxos.some(
          (val) =>
            val.token?.category === request.category &&
            val.token?.nft?.capability === request.nft?.capability
        );
        if (alreadyHas) continue;

        let foundCapability = false;
        for (let i = 0; i < inputs.length; i++) {
          if (usedIndices.has(i)) continue;
          const val = inputs[i];
          if (
            val.token?.category === request.category &&
            val.token?.nft?.capability === request.nft?.capability
          ) {
            const key = utxoKey(val);
            if (selectedSet.has(key)) continue;

            selectedSet.add(key);
            suitableUtxos.push(val);
            usedIndices.add(i);
            amountAvailable += BigInt(val.satoshis);
            foundCapability = true;
            break;
          }
        }
        if (foundCapability) continue;
      }

      // handle splitting the hybrid (FT+NFT) token into its parts
      if (
        request.nft?.capability === undefined &&
        request.nft?.commitment === undefined
      ) {
        const hasCategoryInSuitable = suitableUtxos.some(
          (val) => val.token?.category === request.category
        );
        const hasCategoryInInputs =
          !hasCategoryInSuitable &&
          inputs.some(
            (val, i) =>
              !usedIndices.has(i) &&
              val.token?.category === request.category
          );
        if (hasCategoryInSuitable || hasCategoryInInputs) {
          continue;
        }
      }

      throw Error(
        `No suitable token utxos available to send token with id "${request.category}", capability "${request.nft?.capability}", commitment "${request.nft?.commitment}"`
      );
    }
  }

  // find plain bch outputs
  for (let i = 0; i < inputs.length; i++) {
    // check early if we already have enough
    if (amountRequired && amountAvailable > amountRequired) {
      break;
    }
    if (usedIndices.has(i)) continue;
    const u = inputs[i];
    if (u.token) continue;

    const key = utxoKey(u);
    if (selectedSet.has(key)) continue;

    selectedSet.add(key);
    suitableUtxos.push(u);
    amountAvailable += BigInt(u.satoshis);
  }

  // if the fee is split with a feePaidBy option, skip checking change.
  if (feePaidBy && feePaidBy != FeePaidByEnum.change) {
    return suitableUtxos;
  }

  // If the amount needed is met, or no amount is given, return
  if (typeof amountRequired === "undefined") {
    return suitableUtxos;
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
    return suitableUtxos;
  }
}

// model-based imprecise and fast fee estimation
export async function getFeeAmountSimple({
  utxos,
  sendRequests,
  relayFeePerByteInSatoshi,
  discardChange,
}: {
  utxos: Utxo[];
  sendRequests: Array<SendRequest | TokenSendRequest | OpReturnData>;
  sourceAddress: string;
  relayFeePerByteInSatoshi: number;
  feePaidBy: FeePaidByEnum;
  discardChange?: boolean;
}): Promise<bigint> {
  const inputSizeP2pkh = 148;
  const outputSizeP2pkh = 34;

  const inputTotalSize = utxos.reduce(
    (prev, curr) =>
      prev +
      (curr.token
        ? inputSizeP2pkh +
          1 +
          34 +
          Math.round(1 + (curr.token.nft?.commitment?.length ?? 0) / 2) +
          (curr.token.amount ? 9 : 0)
        : inputSizeP2pkh),
    0
  );

  const outputSize = (sendRequest: SendRequestType) => {
    if (sendRequest.hasOwnProperty("category")) {
      const tokenRequest = sendRequest as TokenSendRequest;
      return (
        outputSizeP2pkh +
        1 +
        34 +
        Math.round(1 + (tokenRequest.nft?.commitment?.length ?? 0) / 2) +
        (tokenRequest.amount ? 9 : 0)
      );
    } else if (sendRequest.hasOwnProperty("buffer")) {
      return 9 + (sendRequest as OpReturnData).buffer.length;
    } else {
      return outputSizeP2pkh;
    }
  };

  const outputTotalSize =
    sendRequests.reduce((prev, curr) => prev + outputSize(curr), 0) +
    (discardChange ? 0 : outputSizeP2pkh);

  return BigInt(
    Math.ceil(
      (inputTotalSize + outputTotalSize + 16) * relayFeePerByteInSatoshi
    )
  );
}

// precise fee estimation
export async function getFeeAmount({
  utxos,
  sendRequests,
  sourceAddress,
  relayFeePerByteInSatoshi,
  feePaidBy,
  discardChange,
  walletCache,
}: {
  utxos: Utxo[];
  sendRequests: Array<SendRequest | TokenSendRequest | OpReturnData>;
  sourceAddress: string;
  relayFeePerByteInSatoshi: number;
  feePaidBy: FeePaidByEnum;
  discardChange?: boolean;
  walletCache?: WalletCache;
}) {
  // build transaction
  if (utxos) {
    // Build the transaction to get the approximate size
    const { encodedTransaction: draftTransaction } =
      await buildEncodedTransaction({
        inputs: utxos,
        outputs: sendRequests,
        signingKey: placeholderPrivateKeyBin,
        fee: 0n, //DUST_UTXO_THRESHOLD
        discardChange: discardChange ?? false,
        feePaidBy,
        changeAddress: "",
        walletCache,
      });

    return BigInt(
      Math.ceil(draftTransaction.length * relayFeePerByteInSatoshi + 1)
    );
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
  fee = 0n,
  discardChange = false,
  feePaidBy = FeePaidByEnum.change,
  changeAddress = "",
  buildUnsigned = false,
  walletCache,
}: {
  inputs: Utxo[];
  outputs: Array<SendRequest | TokenSendRequest | OpReturnData>;
  signingKey: Uint8Array;
  fee?: bigint;
  discardChange?: boolean;
  feePaidBy?: FeePaidByEnum;
  changeAddress?: string;
  buildUnsigned?: boolean;
  walletCache?: WalletCache;
}) {
  const { transaction, sourceOutputs } = await buildP2pkhNonHdTransaction({
    inputs,
    outputs,
    signingKey,
    fee,
    discardChange,
    feePaidBy,
    changeAddress,
    walletCache,
  });

  if (buildUnsigned === true) {
    transaction.inputs.forEach(
      (input) => (input.unlockingBytecode = Uint8Array.from([]))
    );
  }

  return { encodedTransaction: encodeTransaction(transaction), sourceOutputs };
}

export async function signUnsignedTransaction(
  transaction: Uint8Array | string,
  sourceOutputs: SourceOutput[],
  signingKey: Uint8Array
): Promise<Uint8Array> {
  if (typeof transaction === "string") {
    transaction = hexToBin(transaction);
  }

  const decoded = decodeTransaction(transaction);
  if (typeof decoded === "string") {
    throw decoded;
  }

  const template = importWalletTemplate(walletTemplateP2pkhNonHd);
  if (typeof template === "string") {
    throw new Error("Transaction template error");
  }

  const compiler = walletTemplateToCompilerBch(template);
  const transactionTemplate: Readonly<
    TransactionTemplateFixed<typeof compiler>
  > = { ...decoded };
  for (const [index, input] of decoded.inputs.entries()) {
    const sourceOutput = sourceOutputs[index];
    transactionTemplate.inputs[index] = {
      ...input,
      unlockingBytecode: {
        compiler,
        data: {
          keys: { privateKeys: { key: signingKey } },
        },
        valueSatoshis: sourceOutput.valueSatoshis,
        script: "unlock",
        token: sourceOutput.token,
      },
    };
  }

  const result = generateTransaction(transactionTemplate);
  if (!result.success) {
    throw result.errors;
  }

  return encodeTransaction(result.transaction);
}
