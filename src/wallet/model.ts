import { BalanceResponse } from "../util/balanceObjectFromSatoshi";
import { UnitEnum } from "./enum";

// These are the minimal models used to provide types for the express server
//
// This file will be deprecated auto-generated file in the future
// Any business logic contained here should be moved elsewhere in src/

export class SendRequest {
  cashaddr: string;
  value: number;
  unit: UnitEnum;

  constructor({
    cashaddr,
    value,
    unit,
  }: {
    cashaddr: string;
    value: number;
    unit: UnitEnum;
  }) {
    this.cashaddr = cashaddr;
    this.value = value;
    this.unit = unit;
  }
}

export type SendRequestArray = Array<string | number | UnitEnum>;

export class UtxoItem {
  "index"?: number;
  "value": number;
  "unit": UnitEnum;
  "utxoId": string;
  "transactionId": string;
}

export class UtxoResponse {
  "utxos"?: Array<UtxoItem>;
}

export class SendMaxRequest {
  cashaddr: string;

  constructor({ cashaddr }) {
    this.cashaddr = cashaddr;
  }
}

export class SendResponse {
  transactionId?: string;
  balance?: BalanceResponse;

  constructor({
    transactionId,
    balance,
  }: {
    transactionId?: string;
    balance?: any;
  }) {
    this.transactionId = transactionId;
    this.balance = new BalanceResponse(balance);
  }
}
