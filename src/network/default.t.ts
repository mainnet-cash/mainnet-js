import { getNetworkProvider } from "./default";
import { Wallet } from "../wallet/Wif";

test("Should connect to the default cluster", async () => {
  let provider = getNetworkProvider()
  await provider.connect()
  
  expect(provider.network).toBe("mainnet")
  const bal = await provider.getBalance('qp6e6enhpy0fwwu7nkvlr8rgl06ru0c9lywalz8st5')
  expect(bal).toBeGreaterThan(1313545598);
  await provider.disconnect()
});