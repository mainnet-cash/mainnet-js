import { hash160 } from "./hash160";
import { hexToBin } from "@bitauth/libauth";

test("Should calculate the correct hash from a publicKey", async () => {
  let pk = "02d531ce83a065cdc342b1e709106741bb070ea7aaec29d012f2dba956b9027675";
  let pkh = hash160(hexToBin(pk));
  expect(pkh).toStrictEqual(
    hexToBin("e8f538181a07625fc5b2194ea9fa3815f42900a2")
  );
});

test("Should calculate the correct hash from a publicKey", async () => {
  let pk = "02b4632d08485ff1df2db55b9dafd23347d1c47a457072a1e87be26896549a8737";
  let pkh = hash160(hexToBin(pk));
  expect(pkh).toStrictEqual(
    hexToBin("93ce48570b55c42c2af816aeaba06cfee1224fae")
  );
});
