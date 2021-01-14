import { SendRequest } from "../wallet/model";
import { UtxoI } from "../interface";
import { Argument } from "cashscript";

export interface ContractI {
  /**
   * toString should return a serialized representation of the contract
   * @returns returns a serialized representation of the contract
   */
  toString(): string;
  getDepositAddress(): string | Error;

  /**
   * getContractText should return the cashscript text
   * @returns returns contract in script as a string
   */
  getContractText(): string | Error;
}

export interface ContractResponseI {
  contractId: string;
  cashaddr: string;
}

export interface CashscriptTransactionI {
  arguments: Argument[];
  function: string;
  action: string;
  to: SendRequest;
  utxoIds?: string[];
  opReturn?: string[];
  feePerByte?: number;
  hardcodedFee?: number;
  minChange?: number;
  withoutChange?: boolean;
  age?: number;
  time?: number;
}
