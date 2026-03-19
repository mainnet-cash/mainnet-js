import {
  createProvider,
  setGlobalProvider,
  getGlobalProvider,
  removeGlobalProvider,
} from "./default.js";
import { Network } from "../interface.js";
import { networkTickerMap } from "./constant.js";

export async function initProvider(network: Network) {
  if (!getGlobalProvider(network)) {
    const provider = await createProvider(network);
    await provider.connect();
    setGlobalProvider(network, provider);
    return provider;
  }
  return getGlobalProvider(network);
}

export async function initProviders(networks?: Network[]) {
  networks = networks ? networks : (Object.keys(networkTickerMap) as Network[]);
  const results = await Promise.allSettled(networks.map((n) => initProvider(n)));
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      const { reason } = results[i] as PromiseRejectedResult;
      const message = reason instanceof Error ? reason.message : reason;
      console.warn(
        `Warning, couldn't establish a connection for ${networks[i]}: ${message}`
      );
    }
  }
}

async function disconnectProvider(network: Network) {
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
