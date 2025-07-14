import { default as ElectrumNetworkProvider } from "./ElectrumNetworkProvider.js";
import { ElectrumClient } from "@electrum-cash/network";
import { ElectrumWebSocket } from "@electrum-cash/web-socket";
import { default as NetworkProvider } from "./NetworkProvider.js";
import { getDefaultServers, getUserAgent } from "./configuration.js";
import { parseElectrumUrl } from "./util.js";
import { ElectrumHostParams } from "./interface.js";
import { Network } from "../interface.js";
import {
  networkTickerMap,
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
  options?: ElectrumHostParams
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

  manualConnectionManagement = manualConnectionManagement
    ? manualConnectionManagement
    : false;
  servers = servers ? servers : getDefaultServers(network);
  // If the user has passed a single string, assume a single client connection
  if (typeof servers === "string") {
    servers = [servers as string];
  }

  // There were server(s)
  if (servers) {
    const client = getClient(servers[0], network, options);
    let provider = new ElectrumNetworkProvider(
      client,
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

// create a client with a server
function getClient(
  server: string,
  network: Network,
  options?: ElectrumHostParams
) {
  let url = parseElectrumUrl(server);
  return getElectrumClient(url, options?.timeout ?? 120000, network);
}

function getElectrumClient(
  params: ElectrumHostParams,
  timeout: number,
  network: Network
) {
  if (params.scheme?.includes("tcp")) {
    throw Error("TCP connections are not supported.");
  }

  const webSocket = new ElectrumWebSocket(
    params.host,
    params.port,
    params.scheme === "wss",
    timeout
  );
  return new ElectrumClient(
    getUserAgent(),
    ELECTRUM_CASH_PROTOCOL_VERSION,
    webSocket,
    {
      disableBrowserConnectivityHandling: true,
      disableBrowserVisibilityHandling: true,
    }
  );
}
