import { Network } from "..";
import { disconnectProviders, initProviders } from "../network";
import { SlpDbProvider } from "./SlpDbProvider";
import axios from "axios";

describe("Slp tests", () => {
  beforeAll(async () => {
    await initProviders([Network.MAINNET]);
  });

  afterAll(async () => {
    await disconnectProviders([Network.MAINNET]);
  });

  // other SlpDbProvider are covered in the Slp.test.ts integration test suite
  test("Test should fail query", async () => {
    const provider = new SlpDbProvider();
    await expect((provider as any).SlpDbQuery({})).rejects.toThrow();

    axios.interceptors.request.use((config) => {
      config.url = "x" + config.url!;
      return config;
    });

    await expect((provider as any).SlpDbQuery({})).rejects.toThrow();
  });
});
