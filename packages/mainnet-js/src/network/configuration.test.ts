import { Network } from "../interface";
import { Wallet } from "../wallet/Wif";
import * as config from "./configuration";
import * as primary from "./constant";

test("Should get electrum settings from defaults", async () => {
  expect(config.getDefaultServers(Network.MAINNET)).toBe(
    primary.mainnetServers
  );
  expect(config.getDefaultServers(Network.TESTNET)).toBe(
    primary.testnetServers
  );
  expect(config.getDefaultServers(Network.REGTEST)).toBe(
    primary.regtestServers
  );
});

test("Should get electrum settings from DefaultProvider", async () => {
  config.DefaultProvider.servers.mainnet = "wss://example.com:777";

  expect(config.getDefaultServers(Network.MAINNET)).toBe(
    "wss://example.com:777"
  );
  expect(config.getDefaultServers(Network.TESTNET)).toBe(
    primary.testnetServers
  );
  expect(config.getDefaultServers(Network.REGTEST)).toBe(
    primary.regtestServers
  );

  config.DefaultProvider.servers.mainnet = "";
});

test("Should get electrum settings from env", async () => {
  process.env.ELECTRUM = "wss://example.com:1234";
  process.env.ELECTRUM_TESTNET =
    "fallback(wss://test.example.com:1234,wss://test.example.dk:1234)";
  process.env.ELECTRUM_REGTEST = "ws://reg.example.com:1234";
  expect(config.getDefaultServers(Network.MAINNET)).toBe(
    "wss://example.com:1234"
  );
  expect(config.getDefaultServers(Network.TESTNET)).toBe(
    "fallback(wss://test.example.com:1234,wss://test.example.dk:1234)"
  );
  expect(config.getDefaultServers(Network.REGTEST)).toBe(
    "ws://reg.example.com:1234"
  );
});

test("Should get electrum settings from env, comma separated", async () => {
  process.env.ELECTRUM = "wss://bch.imaginary.cash:50004,wss://electrum.imaginary.cash:50004";

  const wallet = await Wallet.newRandom();
  expect(await wallet.getBalance()).toBe(0n);
  await wallet.provider!.disconnect();
});
