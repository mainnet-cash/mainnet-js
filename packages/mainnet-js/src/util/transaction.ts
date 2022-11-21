import { hexToBin, instantiateSha256, binToHex } from "@bitauth/libauth";

let sha256;

export async function getTransactionHash(
  rawTransactionHex: string
): Promise<string> {
  const transactionBin = hexToBin(rawTransactionHex);

  if (!sha256) {
    sha256 = await instantiateSha256();
  }
  // transaction hash is a double sha256 of a raw transaction data, reversed byte order
  return binToHex(sha256.hash(sha256.hash(transactionBin)).reverse());
}
