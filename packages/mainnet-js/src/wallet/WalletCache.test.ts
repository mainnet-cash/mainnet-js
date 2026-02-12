import { RegTestWallet, RegTestWifWallet } from "./Wif";
import { RegTestWatchWallet } from "./Watch";
import { RegTestHDWallet } from "./HDWallet";

describe("Wallet cache initialization", () => {
  test("Seed wallet should have walletCache with at least one entry", async () => {
    const wallet = await RegTestWallet.newRandom();
    expect(wallet.walletCache).toBeDefined();
    expect(wallet.walletCache!.get(wallet.cashaddr)).toBeDefined();
    expect(wallet.walletCache!.get(wallet.cashaddr)!.privateKey).toBeDefined();
  });

  test("Wif wallet should have walletCache with at least one entry", async () => {
    const wallet = await RegTestWifWallet.newRandom();
    expect(wallet.walletCache).toBeDefined();
    expect(wallet.walletCache!.get(wallet.cashaddr)).toBeDefined();
    expect(wallet.walletCache!.get(wallet.cashaddr)!.privateKey).toBeDefined();
  });

  test("Wif wallet from ID should have walletCache with at least one entry", async () => {
    const wallet = await RegTestWallet.fromId(
      "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    );
    expect(wallet.walletCache).toBeDefined();
    expect(wallet.walletCache!.get(wallet.cashaddr)).toBeDefined();
    expect(wallet.walletCache!.get(wallet.cashaddr)!.privateKey).toBeDefined();
  });

  test("HD wallet should have walletCache with at least one entry", async () => {
    const wallet = await RegTestHDWallet.newRandom();
    expect(wallet.walletCache).toBeDefined();
    const depositAddr = wallet.getDepositAddress();
    expect(wallet.walletCache!.get(depositAddr)).toBeDefined();
    expect(wallet.walletCache!.get(depositAddr)!.privateKey).toBeDefined();
    await wallet.stop();
  });

  test("Watch wallet should have empty walletCache", async () => {
    const wallet = await RegTestWatchWallet.watchOnly(
      "bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0"
    );
    expect(wallet.walletCache).toBeDefined();
    expect(wallet.walletCache!.get(wallet.cashaddr)).toBeUndefined();
  });
});
