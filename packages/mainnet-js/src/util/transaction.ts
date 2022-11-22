import { hexToBin, sha256, binToHex } from "@bitauth/libauth";

export async function getTransactionHash(
  rawTransactionHex: string
): Promise<string> {
  const transactionBin = hexToBin(rawTransactionHex);

  // transaction hash is a double sha256 of a raw transaction data, reversed byte order
  return binToHex(sha256.hash(sha256.hash(transactionBin)).reverse());
}
