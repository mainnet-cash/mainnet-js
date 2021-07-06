import { SendRequest } from "../wallet/model";
import { Argument, Recipient as CashscriptRecipientI } from "cashscript";

export interface ContractI {
  /**
   * toString should return a serialized representation of the contract
   * @returns returns a serialized representation of the contract
   */
  toString(): string;

  /**
   * getDepositAddress
   * @returns returns the contract cashaddr
   */
  getDepositAddress(): string | Error;

    /**
   * info
   * @returns returns the contract info
   */
     info(): ContractInfoResponseI | Error;

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

export interface ContractInfoResponseI {
  contractId: string;
  cashaddr: string;
  script: string;
  parameters: string[];
  nonce: number;
}

export interface CashscriptTransactionI {
  arguments: Argument[];
  function: string;
  action: string;
  to:
    | SendRequest
    | SendRequest[]
    | CashscriptRecipientI
    | CashscriptRecipientI[];
  utxoIds?: string[];
  opReturn?: string[];
  feePerByte?: number;
  hardcodedFee?: number;
  minChange?: number;
  withoutChange?: boolean;
  age?: number;
  time?: number;
}
