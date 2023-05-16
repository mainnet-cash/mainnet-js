import { default as ElectrumNetworkProvider } from "./ElectrumNetworkProvider.js";
import { ElectrumCluster, ElectrumClient } from "electrum-cash";
import { default as NetworkProvider } from "./NetworkProvider.js";
import {
  getConfidence,
  getDefaultServers,
  getUserAgent,
} from "./configuration.js";
import { parseElectrumUrl } from "./util.js";
import { ElectrumHostParams, ElectrumClusterParams } from "./interface.js";
import { Network } from "../interface.js";
import {
  networkTickerMap,
  clusterParams,
  ELECTRUM_CASH_PROTOCOL_VERSION,
} from "./constant.js";

export function setGlobalProvider(
  network: Network,
  provider: NetworkProvider
): NetworkProvider {
  const accessor = networkTickerMap[network];
  globalThis[accessor] = provider;
  return provider;
}

export function getGlobalProvider(
  network: Network
): NetworkProvider | undefined {
  const accessor = networkTickerMap[network];
  return globalThis[accessor];
}

export function removeGlobalProvider(network: Network): void {
  const accessor = networkTickerMap[network];
  if (accessor in globalThis) {
    delete globalThis[accessor];
  }
}

export function getNetworkProvider(
  network: Network = Network.MAINNET,
  servers?: string[] | string,
  manualConnectionManagement?: boolean,
  options?: ElectrumClusterParams
): NetworkProvider {
  const globalContext =
    servers === undefined &&
    manualConnectionManagement === undefined &&
    options === undefined;
  if (globalContext) {
    const globalProvider = getGlobalProvider(network);
    if (globalProvider) {
      return globalProvider;
    }
  }

  let useCluster;
  manualConnectionManagement = manualConnectionManagement
    ? manualConnectionManagement
    : false;
  servers = servers ? servers : getDefaultServers(network);
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
      clusterOrClient = getCluster(servers, clusterParam, network);
    }
    // The server is a single string in an array
    else {
      clusterOrClient = getClient(servers, network);
    }
    let provider = new ElectrumNetworkProvider(
      clusterOrClient,
      network,
      manualConnectionManagement
    );

    if (globalContext) {
      return setGlobalProvider(network, provider);
    }

    return provider;
  } else {
    throw Error("No servers provided, defaults not available.");
  }
}

// Create a cluster give a list of servers and parameters
function getCluster(servers: string[], params, network: Network) {
  let electrum = getElectrumCluster(params, network);

  for (const s of servers) {
    let url = parseElectrumUrl(s);
    try {
      electrum.addServer(url.host, url.port, url.scheme, false);
    } catch (error) {
      console.log(
        `Error connecting ${url.host}:${url.port} over ${url.scheme}`
      );
    }
  }
  return electrum;
}

// create a client with a list of servers
function getClient(servers: string[], network: Network) {
  let url = parseElectrumUrl(servers[0]);
  return getElectrumClient(url, 120000, network);
}

function getElectrumCluster(params: ElectrumClusterParams, network: Network) {
  return new ElectrumCluster(
    getUserAgent(),
    ELECTRUM_CASH_PROTOCOL_VERSION,
    params.confidence,
    params.distribution,
    params.order,
    params.timeout
  );
}

function getElectrumClient(
  params: ElectrumHostParams,
  timeout: number,
  network: Network
) {
  return new ElectrumClient(
    getUserAgent(),
    ELECTRUM_CASH_PROTOCOL_VERSION,
    params.host,
    params.port,
    params.scheme,
    timeout
  );
}
