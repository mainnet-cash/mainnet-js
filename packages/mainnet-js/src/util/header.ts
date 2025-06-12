import {
  assertSuccess,
  binToHex,
  hexToBin,
  readUint32LE,
} from "@bitauth/libauth";
import { HeaderI, HexHeaderI } from "../interface.js";

export const decodeHeader = (hexHeader: HexHeaderI): HeaderI => {
  const result = {} as HeaderI;

  const header = hexToBin(hexHeader.hex);
  result.version = assertSuccess(
    readUint32LE({ bin: header, index: 0 })
  ).result;
  result.previousBlockHash = binToHex(header.slice(4, 36).reverse());
  result.merkleRoot = binToHex(header.slice(36, 68).reverse());
  result.timestamp = assertSuccess(
    readUint32LE({ bin: header, index: 68 })
  ).result;
  result.bits = assertSuccess(readUint32LE({ bin: header, index: 72 })).result;
  result.nonce = assertSuccess(readUint32LE({ bin: header, index: 76 })).result;
  result.height = hexHeader.height;

  return result;
};
