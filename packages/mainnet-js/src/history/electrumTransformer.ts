import {
  binToHex,
  decodeTransaction,
  hexToBin,
  lockingBytecodeToCashAddress,
  CashAddressNetworkPrefix,
  decodeCashAddress,
  TransactionCommon,
  assertSuccess,
  Opcodes,
} from "@bitauth/libauth";
import { UnitEnum } from "../enum.js";
import NetworkProvider from "../network/NetworkProvider.js";
import { convert } from "../util/convert.js";
import { HeaderI } from "../interface.js";
import { TransactionHistoryItem, InOutput } from "./interface.js";

type Transaction = TransactionCommon & {
  size: number;
  blockHeight: number;
  timestamp?: number;
  hash: string;
};

export const getAddressHistory = async ({
  address,
  provider,
  unit = "sat",
  fromHeight = 0,
  toHeight = -1,
  start = 0,
  count = -1,
}: {
  address: string;
  provider: NetworkProvider;
  unit?: UnitEnum;
  fromHeight?: number;
  toHeight?: number;
  start?: number;
  count?: number;
}): Promise<TransactionHistoryItem[]> => {
  if (count === -1) {
    count = 1e10;
  }

  const history = (await provider.getHistory(address, fromHeight, toHeight))
    .sort((a, b) =>
      a.height <= 0 || b.height <= 0 ? a.height - b.height : b.height - a.height
    )
    .slice(start, start + count);

  // fill transaction timestamps by requesting headers from network and parsing them
  const heights = history
    .map((tx) => tx.height)
    .filter((height) => height > 0)
    .filter((value, index, array) => array.indexOf(value) === index);
  const timestampMap = (
    await Promise.all(
      heights.map(async (height) => [
        height,
        ((await provider.getHeader(height, true)) as HeaderI).timestamp,
      ])
    )
  ).reduce((acc, [height, timestamp]) => ({ ...acc, [height]: timestamp }), {});

  // first load all transactions
  const historicTransactions = await Promise.all(
    history.map(async (tx) => {
      const txHex = (await provider.getRawTransaction(tx.tx_hash)) as string;

      const transactionCommon = decodeTransaction(hexToBin(txHex));
      if (typeof transactionCommon === "string") {
        throw transactionCommon;
      }

      const transaction = transactionCommon as Transaction;
      transaction.blockHeight = tx.height;
      transaction.timestamp = timestampMap[tx.height];
      transaction.hash = tx.tx_hash;
      transaction.size = txHex.length / 2;

      return transaction;
    })
  );

  // then load their prevout transactions
  const prevoutTransactionHashes = historicTransactions
    .map((tx) =>
      tx.inputs.map((input) => binToHex(input.outpointTransactionHash))
    )
    .flat()
    .filter((value, index, array) => array.indexOf(value) === index);
  const prevoutTransactionMap = (
    await Promise.all(
      prevoutTransactionHashes.map(async (hash) => {
        if (
          hash ===
          "0000000000000000000000000000000000000000000000000000000000000000"
        ) {
          return [hash, undefined];
        }

        const txHex = (await provider.getRawTransaction(hash)) as string;

        const transaction = decodeTransaction(hexToBin(txHex));
        if (typeof transaction === "string") {
          throw transaction;
        }

        return [hash, transaction];
      })
    )
  ).reduce(
    (acc, [hash, transaction]) => ({
      ...acc,
      [hash as string]: transaction as TransactionCommon,
    }),
    {} as { [hash: string]: TransactionCommon }
  );

  const decoded = decodeCashAddress(address);
  if (typeof decoded === "string") {
    throw decoded;
  }

  const addressCache: Record<any, string> = {};

  // map decoded transaction data to TransactionHistoryItem
  const historyItems = historicTransactions.map((tx) => {
    const result = {} as TransactionHistoryItem;

    let inputTotalValue = 0n;
    let outputTotalValue = 0n;

    const isCoinbase =
      tx.inputs.length === 1 &&
      tx.inputs[0].outpointTransactionHash.every((b) => b === 0);

    result.inputs = tx.inputs.map((input) => {
      if (isCoinbase) {
        const halvings = Math.floor(tx.blockHeight / 210000);
        const subsidy = Math.floor(5000000000 / 2 ** halvings);
        inputTotalValue += BigInt(subsidy);

        return {
          address: "coinbase",
          value: subsidy,
        } as InOutput;
      }

      const prevoutTx =
        prevoutTransactionMap[binToHex(input.outpointTransactionHash)];
      if (!prevoutTx) {
        throw new Error("Could not find prevout transaction");
      }

      const prevoutOutput = prevoutTx.outputs[input.outpointIndex];
      if (!prevoutOutput) {
        throw new Error("Could not find prevout output");
      }

      const cached = addressCache[prevoutOutput.lockingBytecode as any];
      let address: string;
      if (!cached) {
        address = assertSuccess(
          lockingBytecodeToCashAddress({
            bytecode: prevoutOutput.lockingBytecode,
            prefix: decoded.prefix as CashAddressNetworkPrefix,
          })
        ).address;
        addressCache[prevoutOutput.lockingBytecode as any] = address;
      } else {
        address = cached;
      }

      inputTotalValue += prevoutOutput.valueSatoshis;

      return {
        address: address,
        value: Number(prevoutOutput.valueSatoshis),
        token: prevoutOutput.token
          ? {
              tokenId: binToHex(prevoutOutput.token.category),
              amount: prevoutOutput.token.amount,
              capability: prevoutOutput.token.nft?.capability
                ? prevoutOutput.token.nft.capability
                : undefined,
              commitment: prevoutOutput.token.nft?.capability
                ? binToHex(prevoutOutput.token.nft.commitment)
                : undefined,
            }
          : undefined,
      } as InOutput;
    });

    result.outputs = tx.outputs.map((output) => {
      const cached = addressCache[output.lockingBytecode as any];
      let address: string;
      if (!cached) {
        if (output.lockingBytecode[0] === Opcodes.OP_RETURN) {
          address = `OP_RETURN: ${binToHex(output.lockingBytecode)}`;
        } else {
          address = assertSuccess(
            lockingBytecodeToCashAddress({
              bytecode: output.lockingBytecode,
              prefix: decoded.prefix as CashAddressNetworkPrefix,
            })
          ).address;
          addressCache[output.lockingBytecode as any] = address;
        }
      } else {
        address = cached;
      }

      outputTotalValue += output.valueSatoshis;

      return {
        address: address,
        value: Number(output.valueSatoshis),
        token: output.token
          ? {
              tokenId: binToHex(output.token.category),
              amount: output.token.amount,
              capability: output.token.nft?.capability
                ? output.token.nft.capability
                : undefined,
              commitment: output.token.nft?.capability
                ? binToHex(output.token.nft.commitment)
                : undefined,
            }
          : undefined,
      } as InOutput;
    });

    result.blockHeight = tx.blockHeight;
    result.timestamp = tx.timestamp;
    result.hash = tx.hash;
    result.size = tx.size;
    result.fee = Number(inputTotalValue - outputTotalValue);

    if (isCoinbase && result.fee) {
      // will indicate the fees collected by the miner
      result.fee = -result.fee;
    }

    return result;
  });

  // compute value changes
  historyItems.forEach((tx) => {
    let satoshiBalance = 0;
    const ftTokenBalances: Record<string, bigint> = {};
    const nftTokenBalances: Record<string, bigint> = {};

    tx.inputs.forEach((input) => {
      if (input.address === address) {
        satoshiBalance -= input.value;

        if (input.token?.amount) {
          ftTokenBalances[input.token.tokenId] =
            (ftTokenBalances[input.token.tokenId] || BigInt(0)) -
            input.token.amount;
        }

        if (input.token?.capability) {
          nftTokenBalances[input.token.tokenId] =
            (nftTokenBalances[input.token.tokenId] || BigInt(0)) - 1n;
        }
      }
    });
    tx.outputs.forEach((output) => {
      if (output.address === address) {
        satoshiBalance += Number(output.value);

        if (output.token?.amount) {
          ftTokenBalances[output.token.tokenId] =
            (ftTokenBalances[output.token.tokenId] || BigInt(0)) +
            output.token.amount;
        }

        if (output.token?.capability) {
          nftTokenBalances[output.token.tokenId] =
            (nftTokenBalances[output.token.tokenId] || BigInt(0)) + 1n;
        }
      }
    });

    tx.valueChange = satoshiBalance;
    tx.tokenAmountChanges = Object.entries(ftTokenBalances).map(
      ([tokenId, amount]) => ({
        tokenId,
        amount,
        nftAmount: BigInt(0),
      })
    );

    for (const [tokenId, nftAmount] of Object.entries(nftTokenBalances)) {
      const tokenChange = tx.tokenAmountChanges.find(
        (tokenChange) => tokenChange.tokenId === tokenId
      );
      if (tokenChange) {
        tokenChange.nftAmount = nftAmount;
      } else {
        tx.tokenAmountChanges.push({
          tokenId,
          amount: BigInt(0),
          nftAmount,
        });
      }
    }
  });

  // order transactions in a way such that receives are always ordered before sends, per block
  historyItems.sort(
    (a, b) =>
      (a.blockHeight <= 0 || b.blockHeight <= 0
        ? a.blockHeight - b.blockHeight
        : b.blockHeight - a.blockHeight) || a.valueChange - b.valueChange
  );

  // backfill the balances
  let prevBalance = await provider.getBalance(address);
  let prevValueChange = 0;
  historyItems.forEach((tx) => {
    tx.balance = prevBalance - prevValueChange;
    prevBalance = tx.balance;
    prevValueChange = tx.valueChange;
  });

  // convert units if needed
  if (!(unit as string).includes("sat")) {
    for (const tx of historyItems) {
      for (const input of tx.inputs) {
        input.value = await convert(input.value, "sat", unit);
      }

      for (const output of tx.outputs) {
        output.value = await convert(output.value, "sat", unit);
      }

      tx.valueChange = await convert(tx.valueChange, "sat", unit);
      tx.balance = await convert(tx.balance, "sat", unit);
    }
  }

  return historyItems;
};
