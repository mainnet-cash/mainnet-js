import { RegTestWallet, TestNetWallet, Wallet } from "./Wif";
import { initProviders, disconnectProviders } from "../network/Connection";

beforeAll(async () => {
  await initProviders();
});
afterAll(async () => {
  await disconnectProviders();
});

describe(`Test creation of wallet from walletId`, () => {
  test("Get a regtest wallet from string id", async () => {
    const ADDRESS = "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0";
    const ADDRESS_TOKEN = "bchreg:zpttdv3qg2usm4nm7talhxhl05mlhms3ysjm0q59vu";

    let w = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    );

    expect(w.cashaddr!.startsWith("bchreg:")).toBeTruthy();
    expect(w.cashaddr!).toBe(ADDRESS);
    expect(w.cashaddr!).toBe(ADDRESS);
    expect(w.tokenaddr!).toBe(ADDRESS_TOKEN);
    let w2 = await RegTestWallet.watchOnly(w.cashaddr!);

    expect(w2.cashaddr!).toBe(ADDRESS);
    expect(w2.cashaddr!).toBe(ADDRESS);
    expect(w2.tokenaddr!).toBe(ADDRESS_TOKEN);

    let w3 = await RegTestWallet.watchOnly(ADDRESS_TOKEN);
    expect(w3.cashaddr!).toBe(ADDRESS);
    expect(w3.cashaddr!).toBe(ADDRESS);
    expect(w3.tokenaddr!).toBe(ADDRESS_TOKEN);
  });

  test("Get create a p2sh32 watch address", async () => {
    const ADDRESS =
      "bitcoincash:pvykylj7uk385669fjse37r2eknx35ngaalx805q2hul62lmx2fq2v5dx6g8w";

    let w = await Wallet.watchOnly(
      "bitcoincash:pvykylj7uk385669fjse37r2eknx35ngaalx805q2hul62lmx2fq2v5dx6g8w"
    );

    expect(w.cashaddr!.startsWith("bitcoincash:")).toBeTruthy();
    expect(w.cashaddr!).toBe(ADDRESS);
  });

  test("Get create a p2sh watch address", async () => {
    const ADDRESS = "bitcoincash:pzvts0uztwg32yvrx7xz9lp572dgnt20sy0dj993vx";

    let w = await Wallet.watchOnly(
      "bitcoincash:pzvts0uztwg32yvrx7xz9lp572dgnt20sy0dj993vx"
    );

    expect(w.cashaddr!.startsWith("bitcoincash:")).toBeTruthy();
    expect(w.cashaddr!).toBe(ADDRESS);
  });
});
