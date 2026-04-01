import { Network } from "../interface.js";
import { getRuntimePlatform } from "../util/index.js";
import * as primary from "./constant.js";

export class DefaultProvider {
  static servers: { [name: string]: string } = {
    mainnet: "",
    testnet: "",
    regtest: "",
  };
}

// Detect plain comma-separated URLs (not already in parse notation like "fallback(...)") and convert
function normalizeServers(value: string): string {
  if (!value) return value;
  // Already parse notation (contains parens) or a single URL - pass through
  if (value.includes("(") || !value.includes(",")) return value;
  // Plain comma-separated URLs: convert to parse notation with fallback
  return primary.toParseNotation(value.split(",").map((s) => s.trim()));
}

export function getDefaultServers(network: Network): string {
  let env: any;
  if (getRuntimePlatform() == "node") {
    env = process.env;
  } else {
    env = {};
  }

  const servers = {
    mainnet:
      DefaultProvider.servers.mainnet ||
      normalizeServers(env.ELECTRUM) ||
      primary.mainnetServers,
    testnet:
      DefaultProvider.servers.testnet ||
      normalizeServers(env.ELECTRUM_TESTNET) ||
      primary.testnetServers,
    regtest:
      DefaultProvider.servers.regtest ||
      normalizeServers(env.ELECTRUM_REGTEST) ||
      primary.regtestServers,
  };

  return servers[network];
}
