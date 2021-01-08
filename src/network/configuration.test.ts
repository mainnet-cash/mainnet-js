import * as config from "./configuration";
import * as primary from "./constant";

test("Should get electrum settings from defaults", async () => {
  let s = config.getDefaultServers();
  expect(s.mainnet).toBe(primary.mainnetServers);
  expect(s.testnet).toBe(primary.testnetServers);
  expect(s.regtest).toBe(primary.regtestServers);
});

test("Should get electrum settings from env", async () => {
  process.env.ELECTRUM = "https://example.com:1234";
  process.env.ELECTRUM_TESTNET =
    "https://test.example.com:1234,https://test.example.dk:1234";
  process.env.ELECTRUM_REGTEST = "ws://reg.example.com:1234";
  let s = config.getDefaultServers();
  expect(s.mainnet).toStrictEqual(["https://example.com:1234"]);
  expect(s.testnet).toStrictEqual([
    "https://test.example.com:1234",
    "https://test.example.dk:1234",
  ]);
  expect(s.regtest).toStrictEqual(["ws://reg.example.com:1234"]);
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
