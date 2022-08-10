import { mnemonicToSeedSync } from "bip39";
import { hexToBin } from "@bitauth/libauth";
import { RegTestWallet } from "./Wif";

describe(`Test bip39 edge cases`, () => {
  test("Should match match the blank seed", async () => {
    let blankSeed =
      "4ed8d4b17698ddeaa1f1559f152f87b5d472f725ca86d341bd0276f1b61197e21dd5a391f9f5ed7340ff4d4513aab9cce44f9497a5e7ed85fd818876b6eb402e";
    let w = mnemonicToSeedSync("");
    let wSeed = new Uint8Array(w.buffer);
    expect(wSeed).toStrictEqual(hexToBin(blankSeed));
  });

  test("Should match match the blank seed", async () => {
    try {
      let w = RegTestWallet.fromSeed("");
      let cashaddr = (await w).address;
      expect(cashaddr).toContain("qr2ju5k5p3akj2k9j26jdjslsk9");
    } catch (e: any) {
      expect(e.message).toBe(`refusing to create wallet from empty mnemonic`);
    }
  });
});
