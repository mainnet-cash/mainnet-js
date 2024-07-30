import { HeaderI, HexHeaderI } from "../interface";

export const decodeHeader = (hexHeader: HexHeaderI): HeaderI => {
  const result = {} as HeaderI;

  const header = Buffer.from(hexHeader.hex, "hex");
  result.version = header.readUInt32LE(0);
  result.previousBlockHash = header.subarray(4, 36).reverse().toString("hex");
  result.merkleRoot = header.subarray(36, 68).reverse().toString("hex");
  result.timestamp = header.readUInt32LE(68);
  result.bits = header.readUInt32LE(72);
  result.nonce = header.readUInt32LE(76);
  result.height = hexHeader.height;

  return result;
};
