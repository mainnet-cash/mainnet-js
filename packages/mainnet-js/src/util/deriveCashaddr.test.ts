import { RegTestWallet, Wallet } from "../wallet/Wif";
import {
  convertAddress,
  deriveCashaddr,
  deriveTokenaddr,
  isTokenaddr,
  isValidAddress,
  toCashaddr,
  toTokenaddr,
} from "./deriveCashaddr";

const p2pkhAddress = "bitcoincash:qpttdv3qg2usm4nm7talhxhl05mlhms3ystlwcm8h4";
const p2pkhTokenAddress =
  "bitcoincash:zpttdv3qg2usm4nm7talhxhl05mlhms3ysv4ax4pgx";

const testnetP2pkhAddress =
  "bchtest:qpttdv3qg2usm4nm7talhxhl05mlhms3ys0d2lessf";
const testnetP2pkhTokenAddress =
  "bchtest:zpttdv3qg2usm4nm7talhxhl05mlhms3ysg8ephk06";

const regtestP2pkhAddress = "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0";
const regtestP2pkhTokenAddress =
  "bchreg:zpttdv3qg2usm4nm7talhxhl05mlhms3ysjm0q59vu";

const p2shAddress = "bitcoincash:ppvamrzvn62c85tv0y4ncdxyy77csxk7qgcjrpwp98";
const p2shTokenAddress =
  "bitcoincash:rpvamrzvn62c85tv0y4ncdxyy77csxk7qglcslq865";

const testnetP2shAddress = "bchtest:ppvamrzvn62c85tv0y4ncdxyy77csxk7qguq8xvkzm";
const testnetP2shTokenAddress =
  "bchtest:rpvamrzvn62c85tv0y4ncdxyy77csxk7qgm25czsag";

const regtestP2shAddress = "bchreg:ppvamrzvn62c85tv0y4ncdxyy77csxk7qgxu3809pa";
const regtestP2shTokenAddress =
  "bchreg:rpvamrzvn62c85tv0y4ncdxyy77csxk7qgpkzepr7w";

const p2sh32Address =
  "bitcoincash:pww87w869tuuzw4avtyxtlwhq32l25xkyy9n3xhzfelhj0d3vm8xx5auz6k7z";
const p2sh32TokenAddress =
  "bitcoincash:rww87w869tuuzw4avtyxtlwhq32l25xkyy9n3xhzfelhj0d3vm8xxxwqrrh8f";

const testnetP2sh32Address =
  "bchtest:pww87w869tuuzw4avtyxtlwhq32l25xkyy9n3xhzfelhj0d3vm8xxh6duz9ts";
const testnetP2sh32TokenAddress =
  "bchtest:rww87w869tuuzw4avtyxtlwhq32l25xkyy9n3xhzfelhj0d3vm8xx9f3amyjm";

const regtestP2sh32Address =
  "bchreg:pww87w869tuuzw4avtyxtlwhq32l25xkyy9n3xhzfelhj0d3vm8xxzslk9juc";
const regtestP2sh32TokenAddress =
  "bchreg:rww87w869tuuzw4avtyxtlwhq32l25xkyy9n3xhzfelhj0d3vm8xxsrrhun9n";

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

  // p2pkh
  expect(toTokenaddr(wallet.cashaddr)).toBe(wallet.tokenaddr);
  expect(toCashaddr(wallet.cashaddr)).toBe(wallet.cashaddr);

  // p2pkh with tokens
  expect(toCashaddr(wallet.tokenaddr)).toBe(wallet.cashaddr);
  expect(toTokenaddr(wallet.tokenaddr)).toBe(wallet.tokenaddr);

  // p2sh
  expect(toCashaddr(p2shAddress)).toBe(p2shAddress);
  expect(toTokenaddr(p2shAddress)).toBe(p2shTokenAddress);

  // p2sh with tokens
  expect(toCashaddr(p2shTokenAddress)).toBe(p2shAddress);
  expect(toTokenaddr(p2shTokenAddress)).toBe(p2shTokenAddress);

  // p2sh32
  expect(toCashaddr(p2sh32Address)).toBe(p2sh32Address);
  expect(toTokenaddr(p2sh32Address)).toBe(p2sh32TokenAddress);

  // p2sh32 with tokens
  expect(toCashaddr(p2sh32TokenAddress)).toBe(p2sh32Address);
  expect(toTokenaddr(p2sh32TokenAddress)).toBe(p2sh32TokenAddress);

  expect(toCashaddr(wallet.tokenaddr)).toBe(
    "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0"
  );
  expect(toTokenaddr(wallet.cashaddr)).toBe(
    "bchreg:zpttdv3qg2usm4nm7talhxhl05mlhms3ysjm0q59vu"
  );

  expect(isTokenaddr(wallet.cashaddr)).toBe(false);
  expect(isTokenaddr(wallet.tokenaddr)).toBe(true);
});

test("Test address network conversion", async () => {
  expect(convertAddress(p2pkhAddress, "mainnet")).toBe(p2pkhAddress);
  expect(convertAddress(p2pkhAddress, "testnet")).toBe(testnetP2pkhAddress);
  expect(convertAddress(p2pkhAddress, "regtest")).toBe(regtestP2pkhAddress);

  expect(convertAddress(p2pkhTokenAddress, "mainnet")).toBe(p2pkhTokenAddress);
  expect(convertAddress(p2pkhTokenAddress, "testnet")).toBe(
    testnetP2pkhTokenAddress
  );
  expect(convertAddress(p2pkhTokenAddress, "regtest")).toBe(
    regtestP2pkhTokenAddress
  );

  expect(convertAddress(p2shAddress, "mainnet")).toBe(p2shAddress);
  expect(convertAddress(p2shAddress, "testnet")).toBe(testnetP2shAddress);
  expect(convertAddress(p2shAddress, "regtest")).toBe(regtestP2shAddress);

  expect(convertAddress(p2shTokenAddress, "mainnet")).toBe(p2shTokenAddress);
  expect(convertAddress(p2shTokenAddress, "testnet")).toBe(
    testnetP2shTokenAddress
  );
  expect(convertAddress(p2shTokenAddress, "regtest")).toBe(
    regtestP2shTokenAddress
  );

  expect(convertAddress(p2sh32Address, "mainnet")).toBe(p2sh32Address);
  expect(convertAddress(p2sh32Address, "testnet")).toBe(testnetP2sh32Address);
  expect(convertAddress(p2sh32Address, "regtest")).toBe(regtestP2sh32Address);

  expect(convertAddress(p2sh32TokenAddress, "mainnet")).toBe(
    p2sh32TokenAddress
  );
  expect(convertAddress(p2sh32TokenAddress, "testnet")).toBe(
    testnetP2sh32TokenAddress
  );
  expect(convertAddress(p2sh32TokenAddress, "regtest")).toBe(
    regtestP2sh32TokenAddress
  );

  // change token awareness
  expect(convertAddress(p2pkhAddress, "mainnet", true)).toBe(p2pkhTokenAddress);
  expect(convertAddress(p2pkhAddress, "mainnet", false)).toBe(p2pkhAddress);
  expect(convertAddress(p2pkhTokenAddress, "mainnet", true)).toBe(
    p2pkhTokenAddress
  );
  expect(convertAddress(p2pkhTokenAddress, "mainnet", false)).toBe(
    p2pkhAddress
  );
});

test("Test isValidAddress", async () => {
  const wallet = await RegTestWallet.watchOnly(process.env.ADDRESS!);
  expect(isValidAddress(wallet.cashaddr)).toBe(true);
  expect(isValidAddress(wallet.tokenaddr)).toBe(true);
  expect(isValidAddress("asdf")).toBe(false);
});
