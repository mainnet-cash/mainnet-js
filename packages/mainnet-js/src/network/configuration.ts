import { Network } from "../interface.js";
import { getRuntimePlatform } from "../util/index.js";
import * as primary from "./constant.js";

let mainnetServers: string[],
  testnetServers: string[],
  regtestServers: string[];

export class DefaultProvider {
  static servers: { [name: string]: string[] } = {
    mainnet: [] as string[],
    testnet: [] as string[],
    regtest: [] as string[],
  };
}

export function getDefaultServers(network: Network) {
  let env: any;
  if (getRuntimePlatform() == "node") {
    env = process.env;
  } else {
    env = {};
  }

  mainnetServers = DefaultProvider.servers.mainnet.length
    ? DefaultProvider.servers.mainnet
    : env.ELECTRUM
    ? env.ELECTRUM.split(",")
    : primary.mainnetServers;
  testnetServers = DefaultProvider.servers.testnet.length
    ? DefaultProvider.servers.testnet
    : env.ELECTRUM_TESTNET
    ? env.ELECTRUM_TESTNET.split(",")
    : primary.testnetServers;
  regtestServers = DefaultProvider.servers.regtest.length
    ? DefaultProvider.servers.regtest
    : env.ELECTRUM_REGTEST
    ? env.ELECTRUM_REGTEST.split(",")
    : primary.regtestServers;

  return {
    mainnet: mainnetServers,
    testnet: testnetServers,
    regtest: regtestServers,
  }[network];
}

export function getUserAgent() {
  // Allow users to configure the cluster confidence
  let ua;
  if (getRuntimePlatform() === "node") {
    ua = process.env.ELECTRUM_USER_AGENT
      ? process.env.ELECTRUM_USER_AGENT
      : "mainnet-js-" + getRuntimePlatform();
  } else {
    ua = "mainnet-js-" + getRuntimePlatform();
  }
  return ua;
}

export function getConfidence() {
  // Allow users to configure the cluster confidence
  let confidence;
  if (getRuntimePlatform() === "node") {
    confidence = process.env.ELECTRUM_CONFIDENCE
      ? parseInt(process.env.ELECTRUM_CONFIDENCE)
      : 1;
  } else {
    confidence = 1;
  }
  return confidence;
}
