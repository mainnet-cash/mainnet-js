import { BalanceResponse } from "../util/balanceObjectFromSatoshi";
import { sanitizeUnit } from "../util/sanitizeUnit";
import { UnitEnum } from "../enum";
import { UtxoI } from "../interface";
import { DELIMITER } from "../constant";

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
    this.unit = sanitizeUnit(unit);
  }
}

export type SendRequestArray = Array<string | number | UnitEnum>;

export class UtxoItem {
  index: number;
  value: number;
  utxoId: string;
  txId: string;

  constructor({
    index,
    value,
    txId,
  }: {
    index: number;
    value: number;
    txId: string;
  }) {
    this.value = value;
    this.txId = txId;
    this.index = index;
    this.utxoId = this.toString();
  }

  public toString() {
    return [this.txId, this.index, this.value].join(DELIMITER);
  }

  public static fromId(utxoId: string) {
    let [txid, vout, satoshis] = utxoId.split(DELIMITER);
    return new this({
      txId: txid,
      index: parseInt(vout),
      value: parseInt(satoshis),
    });
  }
  public static fromElectrum(u: UtxoI) {
    return new this({
      txId: u.txid,
      index: u.vout,
      value: u.satoshis,
    });
  }

  public asElectrum(): UtxoI {
    return {
      txid: this.txId,
      vout: this.index,
      satoshis: this.value,
    } as UtxoI;
  }
}

export class UtxoResponse {
  "utxos"?: Array<UtxoItem>;
}

export class SendResponse {
  txId?: string;
  balance?: BalanceResponse;
  explorerUrl?: string;

  constructor({ txId, balance, explorerUrl }: { txId?: string; balance?: any, explorerUrl?: string}) {
    this.txId = txId;
    this.balance = new BalanceResponse(balance);
    this.explorerUrl = explorerUrl;
  }
}
