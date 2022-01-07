import { BalanceResponse } from "../util/balanceObjectFromSatoshi";
import { sanitizeUnit } from "../util/sanitizeUnit";
import { UnitEnum } from "../enum";
import { UtxoI } from "../interface";
import { DELIMITER } from "../constant";
import { utf8ToBin } from "@bitauth/libauth";

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

export class OpReturnData {
  buffer: Buffer;

  private constructor(buffer: Buffer) {
    this.buffer = Buffer.from(buffer);
  }

  /**
   * from - Construct OP_RETURN data from arbitrary data type
   *
   * @param string   UTF-8 encoded string message to be converted to OP_RETURN data
   *
   * @returns class instance
   */
  public static from(data: string | Buffer) {
    if (data instanceof Buffer) {
      return this.fromBuffer(data as Buffer);
    } else if (typeof data === "string") {
      return this.fromString(data as string);
    }

    throw new Error(`Unsupported data type ${typeof data}`);
  }

  /**
   * fromString - Accept data as a simple UTF-8 string message and append an OP_RETURN and PUSH_DATA1 opcodes to it
   *
   * @param string   UTF-8 encoded string message to be converted to OP_RETURN data
   *
   * @returns class instance
   */
  public static fromString(string: string) {
    const length = new TextEncoder().encode(string).length;
    return new this(
      Buffer.from([...[0x6a, 0x4c, length], ...utf8ToBin(string)])
    );
  }

  /**
   * buffer - Accept OP_RETURN data as a binary buffer.
   * If buffer lacks the OP_RETURN and OP_PUSHDATA opcodes, they will be prepended.
   *
   * @param buffer   Data buffer to be assigned to the OP_RETURN outpit
   *
   * @returns class instance
   */
  public static fromBuffer(buffer: Buffer) {
    if (buffer[0] !== 0x6a) {
      return new this(Buffer.from([...[0x6a, 0x4c, buffer.length], ...buffer]));
    }
    return new this(buffer);
  }
}

export type SendRequestArray = Array<string | number | UnitEnum | Buffer>;

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

  constructor({
    txId,
    balance,
    explorerUrl,
  }: {
    txId?: string;
    balance?: any;
    explorerUrl?: string;
  }) {
    this.txId = txId;
    this.balance = new BalanceResponse(balance);
    this.explorerUrl = explorerUrl;
  }
}

export class XPubKey {
  path: string;
  xPubKey: string;

  constructor({ path, xPubKey }: { path: string; xPubKey: string }) {
    this.path = path;
    this.xPubKey = xPubKey;
  }

  public async ready() {
    await this.xPubKey;
    return this.asObject();
  }

  public asObject() {
    return {
      path: this.path,
      xPubKey: this.xPubKey,
    };
  }
}
