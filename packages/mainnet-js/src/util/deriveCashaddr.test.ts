import { RegTestWallet, Wallet } from "../wallet/Wif";
import {
  deriveCashaddr,
  deriveTokenaddr,
  isTokenaddr,
  toCashaddr,
  toTokenaddr,
} from "./deriveCashaddr";

test("Should derive cashaddr", async () => {
  const wallet = await Wallet.newRandom();
  expect(deriveCashaddr(wallet.privateKey!, wallet.networkPrefix)).toBe(
    wallet.cashaddr!
  );
  expect(deriveTokenaddr(wallet.privateKey!, wallet.networkPrefix)).toBe(
    wallet.tokenaddr!
  );
  expect(deriveTokenaddr(wallet.publicKey!, wallet.networkPrefix)).toBe(
    wallet.tokenaddr!
  );
  expect(
    deriveTokenaddr(wallet.publicKeyCompressed!, wallet.networkPrefix)
  ).toBe(wallet.tokenaddr!);
  expect(deriveTokenaddr(wallet.publicKeyHash!, wallet.networkPrefix)).toBe(
    wallet.tokenaddr!
  );
});

test("Test address conversion", async () => {
  const wallet = await RegTestWallet.watchOnly(process.env.ADDRESS!);
  expect(toTokenaddr(wallet.cashaddr!)).toBe(wallet.tokenaddr);
  expect(toCashaddr(wallet.tokenaddr!)).toBe(wallet.cashaddr);

  expect(toCashaddr(wallet.tokenaddr!)).toBe(
    "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0"
  );
  expect(toTokenaddr(wallet.cashaddr!)).toBe(
    "bchreg:zpttdv3qg2usm4nm7talhxhl05mlhms3ysjm0q59vu"
  );

  expect(isTokenaddr(wallet.cashaddr!)).toBe(false);
  expect(isTokenaddr(wallet.tokenaddr!)).toBe(true);
});
