import { derivePublicKeyHash, derivePrefix } from "./derivePublicKeyHash";

test("Should return the prefix", async () => {
  let prefix1 = derivePrefix(
    "bchreg:pz0z7u9p96h2p6hfychxdrmwgdlzpk5luc22ykt2z6"
  );
  let prefix2 = derivePrefix("pz0z7u9p96h2p6hfychxdrmwgdlzpk5luc22ykt2z6");
  expect(prefix1).toBe("bchreg");
  expect(prefix2).toBe("bchreg");
});
