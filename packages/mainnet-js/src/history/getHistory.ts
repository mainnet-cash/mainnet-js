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
import { TxI } from "../interface.js";
import { TransactionHistoryItem, InOutput } from "./interface.js";
import { ExchangeRate } from "../rate/ExchangeRate.js";
import { sanitizeUnit } from "../util/sanitizeUnit.js";
import { bchParam } from "../chain.js";

type Transaction = TransactionCommon & {
  size: number;
  blockHeight: number;
  timestamp?: number;
  hash: string;
};

export const getHistory = async ({
  addresses,
  provider,
  unit = "sat",
  fromHeight = 0,
  toHeight = -1,
  start = 0,
  count = -1,
  rawHistory,
}: {
  addresses: string[];
  provider: NetworkProvider;
  unit?: UnitEnum;
  fromHeight?: number;
  toHeight?: number;
  start?: number;
  count?: number;
  rawHistory?: TxI[];
}): Promise<TransactionHistoryItem[]> => {
  if (!addresses.length) {
    return [];
  }

  if (count === -1) {
    count = 1e10;
  }

  let history: TxI[];
  if (rawHistory) {
    history = rawHistory.slice(start, start + count);
  } else {
    const allHistory = (
      await Promise.all(
        addresses.map(async (address) =>
          provider.getHistory(address, fromHeight, toHeight)
        )
      )
    ).flat();

    // Dedup using Set instead of O(N²) findIndex
    const seen = new Set<string>();
    const deduped: TxI[] = [];
    for (const item of allHistory) {
      if (!seen.has(item.tx_hash)) {
        seen.add(item.tx_hash);
        deduped.push(item);
      }
    }

    history = deduped
      .sort((a, b) =>
        a.height <= 0 || b.height <= 0
          ? a.height - b.height
          : b.height - a.height
      )
      .slice(start, start + count);
  }

  // Collect unique heights for header fetch
  const uniqueHeightsSet = new Set<number>();
  for (const tx of history) {
    if (tx.height > 0) uniqueHeightsSet.add(tx.height);
  }
  const uniqueHeights = [...uniqueHeightsSet];

  // Batch fetch headers and history transactions in parallel
  const historyHashes = history.map((tx) => tx.tx_hash);
  const [headerMap, txHexMap] = await Promise.all([
    uniqueHeights.length > 0 ? provider.getHeaders(uniqueHeights) : new Map(),
    provider.getRawTransactions(historyHashes),
  ] as const);

  const timestampMap: Record<number, number> = {};
  for (const [height, header] of headerMap) {
    timestampMap[height] = header.timestamp;
  }

  // Precompute binToHex for each input's outpoint hash once
  const inputOutpointHashes = new WeakMap<Uint8Array, string>();
  const getOutpointHash = (bytes: Uint8Array): string => {
    let hash = inputOutpointHashes.get(bytes);
    if (hash === undefined) {
      hash = binToHex(bytes);
      inputOutpointHashes.set(bytes, hash);
    }
    return hash;
  };

  const historicTransactions = history.map((tx) => {
    const txHex = txHexMap.get(tx.tx_hash)!;
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
  });

  // Collect unique prevout hashes using Set, excluding already-fetched txs
  const ZERO_HASH =
    "0000000000000000000000000000000000000000000000000000000000000000";
  const prevoutHashSet = new Set<string>();
  for (const tx of historicTransactions) {
    for (const input of tx.inputs) {
      const hash = getOutpointHash(input.outpointTransactionHash);
      if (hash !== ZERO_HASH && !txHexMap.has(hash)) {
        prevoutHashSet.add(hash);
      }
    }
  }

  // Batch fetch prevout transactions
  const prevoutHashes = [...prevoutHashSet];
  const prevoutHexMap = await provider.getRawTransactions(prevoutHashes);

  // Build prevout transaction map (decode all prevout txs)
  const prevoutTransactionMap: Record<string, TransactionCommon> = {};
  const allPrevoutSources = new Map([...txHexMap, ...prevoutHexMap]);
  for (const tx of historicTransactions) {
    for (const input of tx.inputs) {
      const hash = getOutpointHash(input.outpointTransactionHash);
      if (hash === ZERO_HASH || prevoutTransactionMap[hash]) continue;

      const hex = allPrevoutSources.get(hash);
      if (!hex) continue;

      const decoded = decodeTransaction(hexToBin(hex));
      if (typeof decoded === "string") {
        throw decoded;
      }
      prevoutTransactionMap[hash] = decoded;
    }
  }

  const decoded = assertSuccess(decodeCashAddress(addresses[0]));
  const prefix = decoded.prefix as CashAddressNetworkPrefix;

  const addressCache: Record<any, string> = {};
  const addressSet = new Set(addresses);

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
        prevoutTransactionMap[getOutpointHash(input.outpointTransactionHash)];
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
            prefix: prefix,
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
              category: binToHex(prevoutOutput.token.category),
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
              prefix: prefix,
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
              category: binToHex(output.token.category),
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

  // compute value changes using Set for O(1) address lookup
  historyItems.forEach((tx) => {
    let satoshiBalance = 0;
    const ftTokenBalances: Record<string, bigint> = {};
    const nftTokenBalances: Record<string, bigint> = {};

    tx.inputs.forEach((input) => {
      if (addressSet.has(input.address)) {
        satoshiBalance -= input.value;

        if (input.token?.amount) {
          ftTokenBalances[input.token.category] =
            (ftTokenBalances[input.token.category] || BigInt(0)) -
            input.token.amount;
        }

        if (input.token?.nft?.capability) {
          nftTokenBalances[input.token.category] =
            (nftTokenBalances[input.token.category] || BigInt(0)) - 1n;
        }
      }
    });
    tx.outputs.forEach((output) => {
      if (addressSet.has(output.address)) {
        satoshiBalance += Number(output.value);

        if (output.token?.amount) {
          ftTokenBalances[output.token.category] =
            (ftTokenBalances[output.token.category] || BigInt(0)) +
            output.token.amount;
        }

        if (output.token?.nft?.capability) {
          nftTokenBalances[output.token.category] =
            (nftTokenBalances[output.token.category] || BigInt(0)) + 1n;
        }
      }
    });

    tx.valueChange = satoshiBalance;
    tx.tokenAmountChanges = Object.entries(ftTokenBalances).map(
      ([category, amount]) => ({
        category,
        amount,
        nftAmount: BigInt(0),
      })
    );

    for (const [category, nftAmount] of Object.entries(nftTokenBalances)) {
      const tokenChange = tx.tokenAmountChanges.find(
        (tokenChange) => tokenChange.category === category
      );
      if (tokenChange) {
        tokenChange.nftAmount = nftAmount;
      } else {
        tx.tokenAmountChanges.push({
          category: category,
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
  let prevBalance = (
    await Promise.all(addresses.map((address) => provider.getBalance(address)))
  ).reduce((a, b) => Number(a) + Number(b), 0);

  let prevValueChange = 0;
  historyItems.forEach((tx) => {
    tx.balance = prevBalance - prevValueChange;
    prevBalance = tx.balance;
    prevValueChange = tx.valueChange;
  });

  // convert units if needed — fetch exchange rate once
  if (!(unit as string).includes("sat")) {
    const sanitizedUnit = sanitizeUnit(unit);
    let rate: number = 0;
    if (sanitizedUnit !== UnitEnum.BCH && sanitizedUnit !== UnitEnum.SAT) {
      rate = await ExchangeRate.get(unit);
    }

    const subUnits = Number(bchParam.subUnits);
    const convertSatToUnit = (satValue: number): number => {
      if (sanitizedUnit === UnitEnum.BCH) {
        return satValue / subUnits;
      }
      // currency conversion matching satoshiToAmount behavior
      const currencyValue = Number((satValue * (rate / subUnits)).toFixed(2));
      return currencyValue;
    };

    for (const tx of historyItems) {
      for (const input of tx.inputs) {
        input.value = convertSatToUnit(input.value);
      }

      for (const output of tx.outputs) {
        output.value = convertSatToUnit(output.value);
      }

      tx.valueChange = convertSatToUnit(tx.valueChange);
      tx.balance = convertSatToUnit(tx.balance);
    }
  }

  return historyItems;
};
