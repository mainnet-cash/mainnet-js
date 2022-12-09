import { BalanceResponse } from "../util/balanceObjectFromSatoshi.js";
import { sanitizeUnit } from "../util/sanitizeUnit.js";
import { UnitEnum } from "../enum.js";
import { NFTCapability, UtxoI } from "../interface.js";
import { DELIMITER } from "../constant.js";
import { utf8ToBin } from "@bitauth/libauth";
import { buffer } from "stream/consumers";

// These are the minimal models used to provide types for the express server
//
// This file will be deprecated auto-generated file in the future
// Any business logic contained here should be moved elsewhere in src/

export type SendRequestType =
    SendRequest
  | TokenSendRequest
  | OpReturnData
  | Array<SendRequest | TokenSendRequest | OpReturnData>
  | SendRequestArray[];

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

export class TokenSendRequest {
  cashaddr: string;
  value?: number; // satoshi value
  amount: number; // fungible token amount
  tokenId: string;
  capability?: NFTCapability;
  commitment?: string;

  constructor({
    cashaddr,
    value,
    amount,
    tokenId,
    capability,
    commitment,
  }: {
    cashaddr: string;
    value?: number;
    amount?: number;
    tokenId: string;
    capability?: NFTCapability;
    commitment?: string;
  }) {
    this.cashaddr = cashaddr;
    this.value = value;
    this.amount = amount || 0;
    this.tokenId = tokenId;
    this.capability = capability;
    this.commitment = commitment;
  }
}

export class TokenMintRequest {
  capability?: NFTCapability;
  commitment?: string;
  cashaddr?: string;
  value?: number;

  constructor({
    capability,
    commitment,
    cashaddr,
    value,
  }: {
    capability?: NFTCapability;
    commitment?: string;
    cashaddr?: string;
    value?: number;
  }) {
    // be explicit about minting capability for new NFTs
    this.capability = capability || NFTCapability.none;
    this.commitment = commitment;
    this.cashaddr = cashaddr;
    this.value = value;
  }
}

export class OpReturnData {
  buffer: Buffer;

  public constructor(buffer: Buffer) {
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
    return this.fromArray([data]);
  }

  /**
   * fromString - Accept data as a simple UTF-8 string message and append an OP_RETURN and PUSH_DATA1 opcodes to it
   *
   * @param string   UTF-8 encoded string message to be converted to OP_RETURN data
   *
   * @returns class instance
   */
  public static fromString(string: string) {
    return this.fromArray([string]);
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
      return this.fromArray([buffer]);
    }
    return new this(buffer);
  }

  /**
   * fromArray - Accept array of data
   *
   * @param array   Array of Buffer or UTF-8 encoded string messages to be converted to OP_RETURN data
   *
   * @returns class instance
   */
   public static fromArray(array: Array<string | Buffer>) {
    let data: Buffer = Buffer.from([0x6a]); // OP_RETURN
    for (const element of array) {
      let length: number;
      let elementData: Uint8Array | Buffer;
      let lengthData: any;
      if (typeof element === "string") {
        elementData = utf8ToBin(element);
        length = elementData.length;
      } else if (element instanceof Buffer) {
        elementData = element;
        length = elementData.length;
      } else {
        throw new Error("Wrong data array element");
      }

      if (length < 75) {
        lengthData = [length];
      } else if (length < 220 ) {
        lengthData = [0x4c, length];
      } else {
        throw new Error("OP_RETURN data can not exceed 220 bytes in size");
      }

      data = Buffer.from([...data, ...[lengthData], ...elementData]);
    }

    if (data.length > 220) {
      throw new Error("OP_RETURN data can not exceed 220 bytes in size");
    }

    return new this(data);
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
  tokenIds?: string[];

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
