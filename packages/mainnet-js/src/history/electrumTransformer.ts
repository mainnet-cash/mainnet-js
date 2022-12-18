import {
  binToHex,
  cashAddressToLockingBytecode,
  decodeTransaction,
  hexToBin,
  Transaction,
  lockingBytecodeToCashAddress,
  Output,
} from "@bitauth/libauth";
import { UnitEnum } from "../enum.js";
import NetworkProvider from "../network/NetworkProvider.js";
import { derivePrefix } from "../util/derivePublicKeyHash.js";
import { convert } from "../util/convert.js";
import { bchParam } from "../chain.js";
import { floor } from "../util/floor.js";
import { TransactionHistoryI, TransactionHistoryItemI } from "./interface.js";

export async function getAddressHistory(
  cashaddr: string,
  provider: NetworkProvider,
  unit = "sat",
  start = 0,
  count = 25,
  collapseChange = true
): Promise<TransactionHistoryI> {
  // Get an array of raw transactions as hex
  let txnHashes = await provider.getHistory(cashaddr);

  // Assume transaction hashes will be served in chronological order
  // Slice count in from the end and count to the provided inputs
  let len = txnHashes.length;
  txnHashes = txnHashes.slice(len - start - count, len - start);

  // get the current balance in satoshis
  let currentBalance = await provider.getBalance(cashaddr);

  // Transform the hex transactions to and array of histroy item array promises.
  let txItemPromises = txnHashes.map((tx) => {
    return getDetailedHistory(
      cashaddr,
      tx.tx_hash,
      tx.height,
      provider,
      collapseChange
    );
  });

  // await the history array promises
  let items = await Promise.all(txItemPromises);

  // flatten the array of responses
  let preprocessedTxns = Array.prototype.concat.apply([], items);

  // Reverse chronological order (again), so list appear as newest first.
  preprocessedTxns = preprocessedTxns.reverse();

  // Get the factor to apply the requested unit of measure
  let factor =
    (await convert(bchParam.subUnits, "sat", unit)) / bchParam.subUnits;

  // Apply the unit factor and
  let txns = applyBalance(preprocessedTxns, currentBalance, unit, factor);

  return {
    transactions: txns,
  };
}

export async function getDetailedHistory(
  cashaddr: string,
  hash: string,
  height: number,
  provider: NetworkProvider,
  collapseChange: boolean
): Promise<TransactionHistoryItemI[]> {
  let transactionHex = await provider.getRawTransaction(hash);

  collapseChange;
  let addressBytecode = cashAddressToLockingBytecode(cashaddr);
  if (typeof addressBytecode === "string") throw Error(addressBytecode);

  let transaction = decodeTransaction(hexToBin(transactionHex));
  if (typeof transaction === "string") throw Error(transaction);

  let r: TransactionHistoryItemI[] = [];
  r.push(
    ...(await getMatchingInputs(
      transaction,
      cashaddr,
      height,
      hash,
      provider,
      collapseChange
    ))
  );
  return r;
}

async function getMatchingInputs(
  transaction: Transaction,
  cashaddr: string,
  height: number,
  hash: string,
  provider,
  collapseChange
) {
  let addressBytecode = cashAddressToLockingBytecode(cashaddr);
  if (typeof addressBytecode === "string") throw Error(addressBytecode);
  let lockingBytecodeHex = binToHex(addressBytecode.bytecode);
  let prefix = derivePrefix(cashaddr);

  let inputUtxos = await getInputTransactions(transaction, provider);

  let fee = getFee(
    inputUtxos,
    transaction.outputs,
    lockingBytecodeHex,
    collapseChange
  );

  let r: TransactionHistoryItemI[] = [];

  let txIds: string[] = [];

  for (let input of transaction.inputs) {
    let outpoint = inputUtxos[transaction.inputs.indexOf(input)];

    // if the utxo of the input matches the address in question
    if (binToHex(outpoint.lockingBytecode) === lockingBytecodeHex) {
      for (let output of transaction.outputs) {
        let idx = transaction.outputs.indexOf(output);
        let from = lockingBytecodeToCashAddress(
          outpoint.lockingBytecode,
          prefix
        ) as string;

        // the output was change
        if (binToHex(output.lockingBytecode) === lockingBytecodeHex) {
          if (!collapseChange) {
            r.push({
              from: from,
              to: cashaddr,
              unit: "sat",
              index: idx,
              blockheight: height,
              txn: `${hash}`,
              txId: `${hash}:i:${idx}`,
              value: -Number(output.valueSatoshis),
              fee: 0,
            });
          }
        } else {
          if (!txIds.find((str) => str === `${hash}:i:${idx}`)) {
            // the utxo was sent to another address
            let to = lockingBytecodeToCashAddress(
              output.lockingBytecode,
              prefix
            ) as string;
            r.push({
              from: from,
              to: to,
              unit: "sat",
              index: idx,
              blockheight: height,
              txn: `${hash}`,
              txId: `${hash}:i:${idx}`,
              value: -Number(output.valueSatoshis),
              fee: fee,
            });
            txIds.push(`${hash}:i:${idx}`);
          }
        }
      }
    }
  }

  // check the transaction outputs for receiving transactions
  for (let output of transaction.outputs) {
    // the output was a utxo for the address in question
    if (binToHex(output.lockingBytecode) === lockingBytecodeHex) {
      // the input was from a single address
      if (transaction.inputs.length == 1) {
        const input = transaction.inputs[0];
        const inHash = binToHex(input.outpointTransactionHash);
        const transactionHex = await provider.getRawTransaction(inHash);
        const inTransaction = decodeTransaction(hexToBin(transactionHex));
        if (typeof inTransaction === "string") throw Error(inTransaction);

        let outpoint = inTransaction.outputs[input.outpointIndex];
        let from = lockingBytecodeToCashAddress(
          outpoint.lockingBytecode,
          prefix
        ) as string;

        // if the utxo was from a different address and change is not being output...
        if (from !== cashaddr || !collapseChange) {
          r.push({
            from: from,
            to: cashaddr,
            unit: "sat",
            index: transaction.outputs.indexOf(output),
            blockheight: height,
            txn: `${hash}`,
            txId: `${hash}:o:${transaction.outputs.indexOf(output)}`,
            value: Number(output.valueSatoshis),
          });
        }
      } else {
        let from = transaction.inputs
          .map(
            (i) => `${binToHex(i.outpointTransactionHash)}:o:${i.outpointIndex}`
          )
          .join(";");
        r.push({
          from: from,
          to: cashaddr,
          unit: "sat",
          index: transaction.outputs.indexOf(output),
          blockheight: height,
          txn: `${hash}`,
          txId: `${hash}:o:${transaction.outputs.indexOf(output)}`,
          value: Number(output.valueSatoshis),
          // incoming transactions pay no fee.
          fee: 0,
        });
      }
    }
  }

  return r;
}

async function getInputTransactions(
  transaction: Transaction,
  provider: NetworkProvider
) {
  let inputTransactions: Output[] = [];
  for (let input of transaction.inputs) {
    let inHash = binToHex(input.outpointTransactionHash);
    let transactionHex = await provider.getRawTransaction(inHash);
    let inTransaction = decodeTransaction(hexToBin(transactionHex));
    if (typeof inTransaction === "string") throw Error(inTransaction);

    inputTransactions.push(inTransaction.outputs[input.outpointIndex]);
  }
  return inputTransactions;
}

function getFee(
  inputUtxos: Output[],
  utxos: Output[],
  lockingBytecodeHex,
  collapseChange
) {
  let inValues = 0;
  for (let outpoint of inputUtxos) {
    if (binToHex(outpoint.lockingBytecode)) {
      inValues += Number(outpoint.valueSatoshis);
    }
  }

  const outValues = utxos
    .map((utxo) => Number(utxo.valueSatoshis))
    .reduce((a: number, b: number) => a + b, 0);

  let fee = 0;
  if (collapseChange) {
    const nonChangeOutputs = utxos
      .map((output) =>
        binToHex(output.lockingBytecode) === lockingBytecodeHex ? 0 : 1
      )
      .reduce((a: number, b: number) => a + b, 0);
    fee = floor((inValues - outValues) / nonChangeOutputs, 0);
  } else {
    fee = floor((inValues - outValues) / utxos.length, 0);
  }
  return fee;
}

function applyBalance(
  preprocessedTxns: TransactionHistoryItemI[],
  currentBalance: number,
  unit: string,
  factor: number
): TransactionHistoryItemI[] {
  // balance in satoshis
  let bal = currentBalance;

  let r: TransactionHistoryItemI[] = [];
  for (let txn of preprocessedTxns) {
    // set the balance to the current balance in the appropriate unit
    txn.balance = bal;

    // If fee is not defined, configure it to zero.
    txn.fee = txn.fee ? txn.fee : 0;

    // update the running balance in satoshis for the next record
    // a receiving value is positive, a send is negative
    // The sign is reversed in cronological order from the current balance.
    bal -= txn.value;
    bal += txn.fee;

    // transform the value of the transaction
    txn.value = txn.value * factor;
    txn.fee = txn.fee! * factor;

    // If unit is usd, round to two decimal places.
    if (unit.toLowerCase() == "usd") {
      txn.value = floor(txn.value, 2);
      txn.fee = floor(txn.fee, 2);
    }

    // note the unit
    txn.unit = unit as UnitEnum;

    r.push(txn);
  }
  return r;
}
