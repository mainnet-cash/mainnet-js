import { mine } from "./mine";
import { RegTestWallet } from "../wallet/Wif";

describe(`Test Mining on Regtest`, () => {
  test("Should mine two blocks", async () => {
    const minerWallet = await RegTestWallet.newRandom();
    const response = await mine({ cashaddr: minerWallet.cashaddr!, blocks: 2 });
    expect(response.length).toBe(2);
  });
});
