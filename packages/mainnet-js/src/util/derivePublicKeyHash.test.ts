import {
  hexToBin,
  binToHex,
  instantiateRipemd160,
  instantiateSha256,
  instantiateSecp256k1,
} from "@bitauth/libauth";
import { Wallet } from "../wallet/Wif";
import { derivePublicKeyHash } from "./derivePublicKeyHash";

test("Should return the a public key hash", async () => {
  let pkh = derivePublicKeyHash(
    "bchreg:pz0z7u9p96h2p6hfychxdrmwgdlzpk5luc22ykt2z6"
  );
  let pkh2 = derivePublicKeyHash("pz0z7u9p96h2p6hfychxdrmwgdlzpk5luc22ykt2z6");
  expect(pkh.length).toBe(20);
  expect(pkh2.length).toBe(20);
  expect(pkh).toStrictEqual(pkh2);
});

test("Should calculate public key hash using via hash160", async () => {
  const ripemd160 = await instantiateRipemd160();
  const sha256 = await instantiateSha256();
  let pkh2 = ripemd160.hash(
    sha256.hash(
      hexToBin(
        "02b4632d08485ff1df2db55b9dafd23347d1c47a457072a1e87be26896549a8737"
      )
    )
  );
  expect(pkh2.length).toBe(20);
  expect(binToHex(pkh2)).toEqual("93ce48570b55c42c2af816aeaba06cfee1224fae");
});

test("Should calculate public key hash consistent with hash160", async () => {
  const ripemd160 = await instantiateRipemd160();
  const sha256 = await instantiateSha256();
  const secp256k1 = await instantiateSecp256k1();
  let w = await Wallet.fromId(
    "seed:mainnet:abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
  );
  // using cashaddr functoin
  let pkh = derivePublicKeyHash(w.getDepositAddress());
  // manually from compressed public key
  let publicKeyCompressed = secp256k1.derivePublicKeyCompressed(w.privateKey!);
  if (typeof publicKeyCompressed === "string") {
    throw new Error(publicKeyCompressed);
  }
  let pkh2 = ripemd160.hash(sha256.hash(publicKeyCompressed));
  let pkh3 = w.publicKeyHash!;
  expect(pkh2.length).toBe(20);
  expect(binToHex(pkh)).toEqual("d986ed01b7a22225a70edbf2ba7cfb63a15cb3aa");
  expect(binToHex(pkh2)).toEqual("d986ed01b7a22225a70edbf2ba7cfb63a15cb3aa");
  expect(binToHex(pkh3)).toEqual("d986ed01b7a22225a70edbf2ba7cfb63a15cb3aa");
});

test("Should return the a public key hash of manually set wallet", async () => {
  let w = new Wallet();
  w.privateKey = hexToBin(
    "e284129cc0922579a535bbf4d1a3b25773090d28c909bc0fed73b5e0222cc372"
  );
  // @ts-ignore
  await w.deriveInfo();
  let pkh = derivePublicKeyHash(w.getDepositAddress());
  let expectedPKH = "d986ed01b7a22225a70edbf2ba7cfb63a15cb3aa";
  expect(binToHex(pkh)).toBe(expectedPKH);
});
