import { walletFromIdString } from "./walletFromIdString";

test("Get a regtest wallet from string id", async () => {
  let w = await walletFromIdString(
    "wif:regtest:3h4RrkJS2kSxJZdKho58PgvUJBJJMN2caRxmdWHB8fckx55kC37Gco"
  );
  expect(w.cashaddr?.startsWith("bchreg:")).toBeTruthy();
});

test("Get a testnet wallet from string id", async () => {
  let w = await walletFromIdString(
    "wif:testnet:3h4RrkJS2kSxJZdKho58PgvUJBJJMN2caRxmdWHB8fckx55kC37Gco"
  );
  expect(w.cashaddr?.startsWith("bchtest:")).toBeTruthy();
});

test("Get a mainnet wallet from string id", async () => {
  let w = await walletFromIdString(
    "wif:mainnet:2SahnC2Cm8EEGrbbriHXFxkCkcQA8pjayDo3BJhjVY5M9DQfGD9N3H"
  );
  expect(w.cashaddr?.startsWith("bitcoincash")).toBeTruthy();
});
