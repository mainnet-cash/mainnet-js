import { getRuntimePlatform } from "../util";
import * as primary from "./constant";

let mainnetServers: string[],
  testnetServers: string[],
  regtestServers: string[];

export function getDefaultServers() {
  if (getRuntimePlatform() == "node") {
    mainnetServers = process.env.ELECTRUM
      ? process.env.ELECTRUM.split(",")
      : primary.mainnetServers;
    testnetServers = process.env.ELECTRUM_TESTNET
      ? process.env.ELECTRUM_TESTNET.split(",")
      : primary.testnetServers;
    regtestServers = process.env.ELECTRUM_REGTEST
      ? process.env.ELECTRUM_REGTEST.split(",")
      : primary.regtestServers;
  } else {
    mainnetServers = primary.mainnetServers;
    testnetServers = primary.testnetServers;
    regtestServers = primary.regtestServers;
  }
  return {
    mainnet: mainnetServers,
    testnet: testnetServers,
    regtest: regtestServers,
  };
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

export const defaultServers = getDefaultServers();
