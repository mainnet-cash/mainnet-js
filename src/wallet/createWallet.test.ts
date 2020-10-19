import { walletFromId } from "./createWallet";

test("Get a regtest wallet from string id", async () => {
  let w = await walletFromId(
    "wif:regtest:cQAurrWpGpAtvKcGWvTYFpiTickpTUa3YzXkXpbqD342pscjbCxH"
  );
  expect(w.cashaddr!.startsWith("bchreg:")).toBeTruthy();
});

test("Get a testnet wallet from string id", async () => {
  let w = await walletFromId(
    "wif:testnet:cPS12C2bpGHtKjS5NXNyWyTGGRMPk7D7pjp5JfgxRKWyFnWoDyZg"
  );
  expect(w.cashaddr!.startsWith("bchtest:")).toBeTruthy();
});

test("Get a mainnet wallet from string id", async () => {
  let w = await walletFromId(
    "wif:mainnet:KysvoRyDkxQycBGj49K8oC3minAfoXnVmkcgx6UsZx3g2VvyGCAa"
  );
  expect(w.cashaddr!.startsWith("bitcoincash")).toBeTruthy();
});

test("Expect Error passing testnet wallet to mainnet", async () => {
  expect.assertions(1);
  try {
    await walletFromId(
      "wif:testnet:KysvoRyDkxQycBGj49K8oC3minAfoXnVmkcgx6UsZx3g2VvyGCAa"
    );
  } catch (e) {
    expect(e.message).toBe(
      "Testnet type wif KysvoRyDkxQycBGj49K8oC3minAfoXnVmkcgx6UsZx3g2VvyGCAa passed, should start with c"
    );
  }
});

test("Expect Error passing mainnet wallet to testnet", async () => {
  expect.assertions(1);
  try {
    await walletFromId(
      "wif:mainnet:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    );
  } catch (e) {
    expect(e.message).toBe(
      "Mainnet type wif cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6 passed, should start with L or K"
    );
  }
});

test("Expect Error passing hd wallet", async () => {
  expect.assertions(1);
  try {
    await walletFromId(
      "hd:mainnet:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    );
  } catch (e) {
    expect(e.message).toBe("Heuristic Wallets are not implemented");
  }
});

test("Expect Error passing unknown wallet", async () => {
  expect.assertions(1);
  try {
    await walletFromId(
      "q2k:mainnet:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    );
  } catch (e) {
    expect(e.message).toBe("The wallet type: q2k was not understood");
  }
});
