import { default as ElectrumNetworkProvider } from "./ElectrumNetworkProvider.js";
import { default as NetworkProvider } from "./NetworkProvider.js";
import { getDefaultServers } from "./configuration.js";
import { Network } from "../interface.js";
import { networkTickerMap } from "./constant.js";
import type { ElectrumCashSchema } from "@rpckit/core/electrum-cash";
import { createParseSync } from "@rpckit/core";
import { webSocket } from "@rpckit/websocket/electrum-cash";
import { fallback } from "@rpckit/fallback/electrum-cash";

const parseSync = createParseSync({ webSocket, fallback });

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

export async function createProvider(
  network: Network = Network.MAINNET,
  servers?: string
): Promise<ElectrumNetworkProvider> {
  const serverStr = servers ?? getDefaultServers(network);
  const transport = parseSync<ElectrumCashSchema>(serverStr);
  return new ElectrumNetworkProvider(transport, network);
}

/**
 * Create a MockNetworkProvider via dynamic import.
 * Keeps @mem-cash/electrum out of the production bundle.
 */
export async function createMockProvider(): Promise<NetworkProvider> {
  const { MockNetworkProvider } = await import("./MockNetworkProvider.js");
  let verifier: import("@mem-cash/validation").TxVerifier | undefined;
  try {
    const { createTxVerifier } = await import("@mem-cash/validation");
    verifier = await createTxVerifier();
  } catch {}
  return new MockNetworkProvider({ indexerConfig: { verifier } });
}

export function getNetworkProvider(
  network: Network = Network.MAINNET
): NetworkProvider {
  const globalProvider = getGlobalProvider(network);
  if (globalProvider) {
    return globalProvider;
  }

  const serverStr = getDefaultServers(network);
  const transport = parseSync<ElectrumCashSchema>(serverStr);
  const provider = new ElectrumNetworkProvider(transport, network);
  setGlobalProvider(network, provider);
  return provider;
}
