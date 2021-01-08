import { default as ElectrumNetworkProvider } from "./ElectrumNetworkProvider";
import { ElectrumCluster, ElectrumClient } from "electrum-cash";
import { default as NetworkProvider } from "./NetworkProvider";
import { defaultServers, getConfidence, getUserAgent } from "./configuration";
import { parseElectrumUrl } from "./util";
import { ElectrumHostParams, ElectrumClusterParams } from "./interface";
import { Network } from "../interface";
import { networkTickerMap, clusterParams } from "./constant";
import { ELECTRUM_CASH_PROTOCOL_VERSION } from "./constant";

function setGlobalProvider(
  network: Network,
  provider: NetworkProvider
): NetworkProvider {
  let accessor = networkTickerMap[network];
  if (globalThis[accessor]) {
    return globalThis[accessor];
  } else {
    globalThis[accessor] = provider;
    return globalThis[accessor];
  }
}

function getGlobalProvider(network: Network): NetworkProvider | void {
  let accessor = networkTickerMap[network];
  if (globalThis[accessor]) {
    return globalThis[accessor];
  } else {
    return;
  }
}

export function getNetworkProvider(
  network: Network = Network.MAINNET,
  servers?: string[] | string,
  manualConnectionManagement?: boolean,
  options?: ElectrumClusterParams
): NetworkProvider {
  let useCluster;
  manualConnectionManagement = manualConnectionManagement
    ? manualConnectionManagement
    : false;
  servers = servers ? servers : defaultServers[network];

  let globalProvider = getGlobalProvider(network);
  if (globalProvider) {
    return globalProvider;
  }
  // If the user has passed a single string, assume a single client connection
  if (typeof servers === "string") {
    servers = [servers as string];
    useCluster = false;
  }

  // Otherwise, assume a list of servers has been passed
  else {
    servers = servers;
    useCluster = servers.length > 1;
  }

  // There were server(s)
  if (servers) {
    let clusterOrClient;
    // There were multiple servers
    if (useCluster) {
      let clusterParam = clusterParams[network];
      clusterParam["confidence"] = getConfidence();
      clusterParam = Object.assign({}, clusterParam, options);
      clusterOrClient = getCluster(servers, clusterParam);
    }
    // The server is a single string in an array
    else {
      clusterOrClient = getClient(servers);
    }
    let provider = new ElectrumNetworkProvider(
      clusterOrClient,
      network,
      manualConnectionManagement
    );
    return setGlobalProvider(network, provider);
  } else {
    throw Error("No servers provided, defaults not available.");
  }
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
    getUserAgent(),
    ELECTRUM_CASH_PROTOCOL_VERSION,
    params.confidence,
    params.distribution,
    params.order,
    params.timeout
  );
}

function getElectrumClient(params: ElectrumHostParams, timeout: number) {
  return new ElectrumClient(
    getUserAgent(),
    ELECTRUM_CASH_PROTOCOL_VERSION,
    params.host,
    params.port,
    params.scheme,
    timeout
  );
}
