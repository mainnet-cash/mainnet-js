import { default as ElectrumNetworkProvider } from "./ElectrumNetworkProvider";
import { ElectrumCluster, ElectrumClient } from "electrum-cash";
import { default as NetworkProvider } from "./NetworkProvider";
import * as config from "./constant";
import { parseElectrumUrl } from "./util";
import { ElectrumHostParams, ElectrumClusterParams } from "./interface";
import { Network } from "../interface";

const APPLICATION_USER_AGENT = "mainnet-js";
const ELECTRUM_CASH_PROTOCOL_VERSION = "1.4.1";

export function getNetworkProvider(
  network: Network = Network.MAINNET,
  servers?: string[] | string,
  manualConnectionManagement = false
): NetworkProvider {
  let useCluster;
  servers = servers ? servers : config.defaultServers[network];
  // If the user has passed a single string, assume a single client connection

  if (typeof servers === "string") {
    servers = [servers as string];
    useCluster = false;
  }
  // Otherwise assume a list of servers has been passed
  else {
    servers = servers;
    useCluster = servers.length > 1;
  }
  if (servers) {
    let c;
    if (useCluster) {
      const clusterParams = config.clusterParams[network];
      clusterParams["confidence"] = getConfidence();
      c = getCluster(servers, clusterParams);
    } else {
      c = getClient(servers);
    }
    return new ElectrumNetworkProvider(c, network, manualConnectionManagement);
  } else {
    throw Error("No servers provided, defaults not available.");
  }
}

function getConfidence() {
  // Allow users to configure the cluster confidence
  let confidence;
  if (typeof process !== "undefined") {
    confidence = process.env.CLUSTER_CONFIDENCE
      ? process.env.CLUSTER_CONFIDENCE
      : 1;
  } else {
    confidence = 1;
  }
  return confidence;
}

// Create a cluster give a list of servers and parameters
function getCluster(servers: string[], params) {
  let electrum = getElectrumCluster(params);

  for (const s of servers) {
    let url = parseElectrumUrl(s);
    electrum.addServer(url.host, url.port, url.scheme, false);
  }
  return electrum;
}

// create a client with a list of servers
function getClient(servers: string[]) {
  let url = parseElectrumUrl(servers[0]);
  return getElectrumClient(url, 50000);
}

function getElectrumCluster(params: ElectrumClusterParams) {
  return new ElectrumCluster(
    APPLICATION_USER_AGENT,
    ELECTRUM_CASH_PROTOCOL_VERSION,
    params.confidence,
    params.distribution,
    params.order,
    params.timeout
  );
}

function getElectrumClient(params: ElectrumHostParams, timeout) {
  return new ElectrumClient(
    APPLICATION_USER_AGENT,
    ELECTRUM_CASH_PROTOCOL_VERSION,
    params.host,
    params.port,
    params.scheme,
    timeout
  );
}
