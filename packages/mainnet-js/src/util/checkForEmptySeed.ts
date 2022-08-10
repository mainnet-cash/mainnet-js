import { binToHex } from "@bitauth/libauth";

export function checkForEmptySeed(seed: Buffer) {
  let blankSeed =
    "4ed8d4b17698ddeaa1f1559f152f87b5d472f725ca86d341bd0276f1b61197e21dd5a391f9f5ed7340ff4d4513aab9cce44f9497a5e7ed85fd818876b6eb402e";
  let seedBin = new Uint8Array(seed.buffer);
  if (blankSeed == binToHex(seedBin))
    throw Error("Seed was generated using empty mnemonic");
}
