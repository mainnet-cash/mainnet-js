import { Network } from "..";
import { disconnectProviders, initProviders } from "../network";

describe("Slp tests", () => {
  beforeAll(async () => {
    await initProviders([Network.MAINNET]);
  });

  afterAll(async () => {
    await disconnectProviders([Network.MAINNET]);
  });
});
