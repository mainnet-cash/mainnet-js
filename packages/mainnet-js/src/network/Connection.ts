import { Network } from "../interface.js";
import { networkTickerMap } from "./constant.js";
import {
  createMockProvider,
  createProvider,
  getGlobalProvider,
  removeGlobalProvider,
  setGlobalProvider,
} from "./default.js";
import type { MockNetworkProvider } from "./MockNetworkProvider.js";

export async function initProvider(network: Network) {
  if (!getGlobalProvider(network)) {
    if (process.env.USE_MOCK_PROVIDER) {
      if (network !== Network.REGTEST) return;
      const provider = (await createMockProvider()) as MockNetworkProvider;
      await provider.ready();
      await provider.seedAlice();
      setGlobalProvider(network, provider);
      return provider;
    }
    const provider = await createProvider(network);
    await provider.connect();
    setGlobalProvider(network, provider);
    return provider;
  }
  return getGlobalProvider(network);
}

export async function initProviders(networks?: Network[]) {
  networks = networks ? networks : (Object.keys(networkTickerMap) as Network[]);
  const results = await Promise.allSettled(
    networks.map((n) => initProvider(n)),
  );
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      const { reason } = results[i] as PromiseRejectedResult;
      const message = reason instanceof Error ? reason.message : reason;
      console.warn(
        `Warning, couldn't establish a connection for ${networks[i]}: ${message}`,
      );
    }
  }
}

async function disconnectProvider(network: Network) {
  if (process.env.USE_MOCK_PROVIDER) return;
  const provider = getGlobalProvider(network);
  if (provider) {
    await provider.disconnect();
    removeGlobalProvider(network);
  }
}

export async function disconnectProviders(networks?: Network[]) {
  networks = networks ? networks : (Object.keys(networkTickerMap) as Network[]);
  await Promise.all(networks.map((n) => disconnectProvider(n)));
}
