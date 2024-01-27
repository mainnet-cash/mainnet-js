import { mnemonicToSeedSync } from "@scure/bip39";
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

  test("Should match the blank seed", async () => {
    try {
      let w = RegTestWallet.fromSeed(new Array(11).join("abandon ")+"about");
      let cashaddr = (await w).address;
      expect(cashaddr).toContain("qrvcdmgpk73zyfd8pmdl9wnuld36zh9n4gms8s0u59");
    } catch (e: any) {
      expect(e.message).toBe(`refusing to create wallet from empty mnemonic`);
    }
  });
});
