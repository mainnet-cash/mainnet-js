export const networkTickerMap = {
  mainnet: "BCH",
  testnet: "tBCH",
  regtest: "rBCH",
};

const opts =
  "connectTimeout=5000&timeout=5000&keepAlive=60000&protocolVersion=1.6&batchSize=5";

export function toParseNotation(urls: string[]): string {
  const withOpts = urls.map((u) => `${u}?${opts}`);
  if (withOpts.length === 1) return withOpts[0];
  return `fallback(${withOpts.join(",")})?eagerConnect=true&rank=true`;
}

export const mainnetServers = toParseNotation([
  "wss://bch.imaginary.cash:50004",
  "wss://electrum.imaginary.cash:50004",
  "wss://fulcrum.pat.mn:50004",
]);

// chipnet
export const testnetServers = toParseNotation([
  "wss://chipnet.bch.ninja:50004",
  "wss://chipnet.imaginary.cash:50004",
  "wss://chipnet.c3-soft.com:64004",
]);

export const regtestServers = toParseNotation([
  "ws://127.0.0.1:60003",
  "ws://host.docker.internal:60003",
]);

export const defaultServers = {
  mainnet: mainnetServers,
  testnet: testnetServers,
  regtest: regtestServers,
};
