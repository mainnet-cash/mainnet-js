import { getNetworkProvider } from "./default";
import { Wallet } from "../wallet/Wif";

test("Should connect to the default ", async () => {
  let network =   getNetworkProvider('mainnet')
  expect(network.network).toBe("mainnet")
  expect(await network.ready()).toBeTruthy()
  const bal = network.getBalance('qp6e6enhpy0fwwu7nkvlr8rgl06ru0c9lywalz8st5')
  expect(bal).toBeGreaterThan(1313545598);

});