import { deriveSeedFromBip39Mnemonic, hexToBin } from "@bitauth/libauth";
import { RegTestWallet } from "./Wif";

describe(`Test bip39 edge cases`, () => {
  test("Should match match the abandon seed", async () => {
    let abandonSeed =
      "9d7aab1883c82345264e144366d69edacb85be1b311bd97487e241c1a7f6f870dbab428e30f584ea75a608d2d5c50af5199ca79dba02108d85a4272e55f43449";
    let w = deriveSeedFromBip39Mnemonic(new Array(12).join("abandon "));
    let wSeed = new Uint8Array(w.buffer);
    expect(wSeed).toStrictEqual(hexToBin(abandonSeed));
  });

  test("Should catch a blank seed", async () => {
    try {
      let w = RegTestWallet.fromSeed("");
      let cashaddr = (await w).cashaddr;
      expect(cashaddr).toContain(
        "bchreg:qrvcdmgpk73zyfd8pmdl9wnuld36zh9n4g974kwcsl"
      );
    } catch (e: any) {
      expect(e.message).toBe(`refusing to create wallet from empty mnemonic`);
    }
  });

  test("Should catch an invalid seed", async () => {
    try {
      let w = RegTestWallet.fromSeed(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon"
      );
      let cashaddr = (await w).cashaddr;
      expect(cashaddr).toContain(
        "bchreg:qrvcdmgpk73zyfd8pmdl9wnuld36zh9n4g974kwcsl"
      );
    } catch (e: any) {
      expect(e.message).toBe(`Invalid mnemonic`);
    }
  });

  test("Should match the blank seed", async () => {
    let w = RegTestWallet.fromSeed(
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    );
    let cashaddr = (await w).cashaddr;
    expect(cashaddr).toContain(
      "bchreg:qrvcdmgpk73zyfd8pmdl9wnuld36zh9n4g974kwcsl"
    );
  });
});
