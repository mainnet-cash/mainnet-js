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
    this.unit = unit.toLocaleLowerCase() as UnitEnum;
  }
}

export type SendRequestArray = Array<string | number | UnitEnum>;

export class UtxoItem {
  "index"?: number;
  "value": number;
  "unit": UnitEnum;
  "utxoId": string;
  "txId": string;
}

export class UtxoResponse {
  "utxos"?: Array<UtxoItem>;
}

export class SendResponse {
  txId: string;
  balance: BalanceResponse;

  constructor({ txId, balance }: { txId: string; balance: any }) {
    this.txId = txId;
    this.balance = new BalanceResponse(balance);
  }
}
