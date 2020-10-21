import { mine } from "./mine";

describe(`Test Mining on Regtest`, () => {
  test("Should mine two blocks", async () => {
    if (!process.env.ADDRESS) {
      throw Error("Attempted to pass an empty Address");
    } else {
      let response = await mine({ cashaddr: process.env.ADDRESS, blocks: 2 });
      expect(response.length).toBe(2);
    }
  });
});
