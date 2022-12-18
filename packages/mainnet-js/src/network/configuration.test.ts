import { Network } from "../interface";
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
  config.DefaultProvider.servers.mainnet = ["wss://example.com:777"];

  expect(config.getDefaultServers(Network.MAINNET)).toStrictEqual([
    "wss://example.com:777",
  ]);
  expect(config.getDefaultServers(Network.TESTNET)).toBe(
    primary.testnetServers
  );
  expect(config.getDefaultServers(Network.REGTEST)).toBe(
    primary.regtestServers
  );

  config.DefaultProvider.servers.mainnet = [];
});

test("Should get electrum settings from env", async () => {
  process.env.ELECTRUM = "https://example.com:1234";
  process.env.ELECTRUM_TESTNET =
    "https://test.example.com:1234,https://test.example.dk:1234";
  process.env.ELECTRUM_REGTEST = "ws://reg.example.com:1234";
  expect(config.getDefaultServers(Network.MAINNET)).toStrictEqual([
    "https://example.com:1234",
  ]);
  expect(config.getDefaultServers(Network.TESTNET)).toStrictEqual([
    "https://test.example.com:1234",
    "https://test.example.dk:1234",
  ]);
  expect(config.getDefaultServers(Network.REGTEST)).toStrictEqual([
    "ws://reg.example.com:1234",
  ]);
});

test("Should get electrum cluster confidence from defaults", async () => {
  let c = config.getConfidence();
  expect(c).toStrictEqual(1);
});

test("Should get electrum cluster confidence from env", async () => {
  process.env.ELECTRUM_CONFIDENCE = "2";
  let c = config.getConfidence();
  expect(c).toStrictEqual(2);
});
