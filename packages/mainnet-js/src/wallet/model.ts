import { BalanceResponse } from "../util/balanceObjectFromSatoshi.js";
import { sanitizeUnit } from "../util/sanitizeUnit.js";
import { UnitEnum } from "../enum.js";
import { NFTCapability, UtxoI } from "../interface.js";
import { DELIMITER } from "../constant.js";
import {
  Input,
  Output,
  binToNumberUint16LE,
  binToUtf8,
  hexToBin,
  utf8ToBin,
} from "@bitauth/libauth";
import { Config } from "../config.js";
import { checkTokenaddr } from "../util/deriveCashaddr.js";

// These are the minimal models used to provide types for the express server
//
// This file will be deprecated auto-generated file in the future
// Any business logic contained here should be moved elsewhere in src/

export type SendRequestType =
  | SendRequest
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

export class TokenGenesisRequest {
  amount?: number; // fungible token amount
  capability?: NFTCapability;
  commitment?: string;
  cashaddr?: string;
  value?: number; // satoshi value

  constructor({
    amount,
    capability,
    commitment,
    cashaddr,
    value,
  }: {
    amount?: number;
    capability?: NFTCapability;
    commitment?: string;
    cashaddr?: string;
    value?: number;
  }) {
    this.amount = amount;
    this.capability = capability;
    this.commitment = commitment;
    this.cashaddr = cashaddr;
    this.value = value;
  }
}

export class TokenBurnRequest {
  tokenId: string;
  capability?: NFTCapability;
  commitment?: string;
  amount?: number; // fungible token amount
  cashaddr?: string;

  constructor({
    tokenId,
    capability,
    commitment,
    amount,
    cashaddr,
  }: {
    tokenId: string;
    capability?: NFTCapability;
    commitment?: string;
    amount?: number;
    cashaddr?: string;
  }) {
    this.tokenId = tokenId;
    this.capability = capability;
    this.commitment = commitment;
    this.amount = amount;
    this.cashaddr = cashaddr;
  }
}

export class TokenSendRequest {
  cashaddr: string; // cashaddr or tokenaddr to send tokens to
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
    checkTokenaddr(cashaddr, Config.EnforceCashTokenReceiptAddresses);

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
    this.capability = capability;
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
  public static from(data: string | Buffer | Uint8Array) {
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
   * buffer - Accept OP_RETURN data as a binary buffer.
   * If buffer lacks the OP_RETURN and OP_PUSHDATA opcodes, they will be prepended.
   *
   * @param buffer   Data buffer to be assigned to the OP_RETURN outpit
   *
   * @returns class instance
   */
  public static fromUint8Array(uint8Array: Uint8Array) {
    if (uint8Array[0] !== 0x6a) {
      return this.fromArray([uint8Array]);
    }
    return new this(Buffer.from(uint8Array));
  }

  /**
   * fromArray - Accept array of data
   *
   * @param array   Array of Buffer or UTF-8 encoded string messages to be converted to OP_RETURN data
   *
   * @returns class instance
   */
  public static fromArray(array: Array<string | Buffer | Uint8Array>) {
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
      } else if (element instanceof Uint8Array) {
        elementData = Buffer.from(element);
        length = elementData.length;
      } else {
        throw new Error("Wrong data array element");
      }

      if (length < 76) {
        // OP_PUSHDATA_1
        lengthData = [length];
      } else if (length < 223) {
        // default max `-datacarriersize`
        lengthData = [0x4c, length];
      } else {
        throw new Error("OP_RETURN data can not exceed 220 bytes in size");
      }

      data = Buffer.from([...data, ...lengthData, ...elementData]);
    }

    if (data.length > 220) {
      throw new Error("OP_RETURN data can not exceed 220 bytes in size");
    }

    return new this(data);
  }

  /**
   * parseBinary - parse OP_RETURN data and return pushed chunks of binary data
   *
   * @param opReturn   Raw OP_RETURN data
   *
   * @returns array of binary data chunks pushed
   */
  public static parseBinary(opReturn: Uint8Array): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    let position = 1;

    // handle direct push, OP_PUSHDATA1, OP_PUSHDATA2;
    // OP_PUSHDATA4 is not supported in OP_RETURNs by consensus
    while (opReturn[position]) {
      let length = 0;
      if (opReturn[position] === 0x4c) {
        length = opReturn[position + 1];
        position += 2;
      } else if (opReturn[position] === 0x4d) {
        length = binToNumberUint16LE(
          opReturn.slice(position + 1, position + 3)
        );
        position += 3;
      } else {
        length = opReturn[position];
        position += 1;
      }

      chunks.push(opReturn.slice(position, position + length));
      position += length;
    }

    return chunks;
  }

  /**
   * parse - parse OP_RETURN hex data and return pushed chunks of binary data, converted to utf8 strings
   *
   * @param opReturn   Raw OP_RETURN hex data
   *
   * @returns array of binary data chunks pushed, converted to utf8 strings
   */
  public static parse(opReturnHex: string): string[] {
    return this.parseBinary(hexToBin(opReturnHex)).map((val) => binToUtf8(val));
  }
}

export type SendRequestArray = Array<string | number | UnitEnum | Buffer>;

export type SourceOutput = Input & Output;

export class SendResponse {
  txId?: string;
  balance?: BalanceResponse;
  explorerUrl?: string;
  tokenIds?: string[];
  unsignedTransaction?: string; // unsigned transaction hex
  sourceOutputs?: SourceOutput[]; // source outputs for signing unsigned transactions

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

export const fromUtxoId = (utxoId: string): UtxoI => {
  const [txid, vout, satoshis, tokenId, amount, capability, commitment] =
    utxoId.split(DELIMITER);
  return {
    satoshis: satoshis ? parseInt(satoshis) : 0,
    vout: parseInt(vout),
    txid,
    token: tokenId
      ? {
          tokenId,
          amount: parseInt(amount),
          capability: capability || undefined,
          commitment: commitment || undefined,
        }
      : undefined,
  } as UtxoI;
};

export const toUtxoId = (utxo: UtxoI): string => {
  return [
    utxo.txid,
    utxo.vout,
    utxo.satoshis,
    utxo.token?.tokenId,
    utxo.token?.amount,
    utxo.token?.capability,
    utxo.token?.commitment,
  ]
    .join(DELIMITER)
    .replace(/:+$/, "");
};
