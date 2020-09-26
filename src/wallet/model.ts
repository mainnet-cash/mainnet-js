import { bchParam } from "../chain";
import { BalanceResponse } from "../util/balanceObjectFromSatoshi";
import { UnitEnum } from "./enum";

// These are the minimal models used to provide types for the express server
//
// This file will be deprecated auto-generated file in the future
// Any business logic contained here should be moved elsewhere in src/

export class SendRequest {
  cashaddr: string;
  amount: Amount;

  constructor({ cashaddr, amount }: { cashaddr: string; amount: AmountType| { value: number, unit: UnitEnum } }) {
    this.cashaddr = cashaddr;
    this.amount = new Amount(amount);
  }
}

export class UtxoItem {
  "index"?: number;
  "amount": Amount;
  "utxoId": string;
  "transactionId": string;
}

export class UtxoResponse {
  "utxos"?: Array<UtxoItem>;
}

export class Amount {
  value: number;
  unit: UnitEnum;
  constructor({ value, unit }: AmountType|{ value: number; unit: UnitEnum }) {
    this.value = value;
    this.unit = unit;
  }

  public inSatoshi(): BigInt | Error {
    switch (this.unit) {
      case UnitEnum.Satoshi:
        return BigInt(this.value);
      case UnitEnum.Sat:
        return BigInt(this.value);
      case UnitEnum.Sats:
        return BigInt(this.value);
      case UnitEnum.Satoshis:
        return BigInt(this.value);
      case UnitEnum.Bch:
        return BigInt(this.value * bchParam.subUnits);
      default:
        throw Error("Unit of value not defined");
    }
  }
}

export type AmountType = (typeof Amount)[keyof typeof Amount];

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
