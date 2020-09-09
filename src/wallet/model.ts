import { bchParam } from "../chain";
import { BalanceResponse } from "../util/balanceObjectFromSatoshi";
import { UnitEnum } from "./enum"

// These are the minimal models used to provide types for the express server
// 
// This file will be deprecated auto-generated file in the future
// Any business logic contained here should be moved elsewhere in src/

export class SendRequest {
    cashaddr: string;
    amount: Amount;
  
    constructor({ cashaddr, amount }: { cashaddr: string; amount: Amount }) {
      this.cashaddr = cashaddr;
      this.amount = new Amount(amount);
    }
  }
  
  export class Utxo {
    "index"?: number;
    "amount": Amount;
    "utxoId": string;
    "transaction": string;
  }
  
  export class UtxoResponse {
    "utxos"?: Array<Utxo>;
  }
  
  export class Amount {
    value: number;
    unit: UnitEnum;
    constructor({ value, unit }: { value: number; unit: UnitEnum }) {
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
  
  export class SendMaxRequest {
    cashaddr: string;
  
    constructor({ cashaddr }) {
      this.cashaddr = cashaddr;
    }
  }
  
  export class SendResponse {
    transaction?: string;
    balance?: BalanceResponse;
  
    constructor({
      transaction,
      balance,
    }: {
      transaction?: string;
      balance?: any;
    }) {
      this.transaction = transaction;
      this.balance = new BalanceResponse(balance);
    }
  }