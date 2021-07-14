import { default as NetworkProvider } from "./NetworkProvider";
import { getNetworkProvider, setGlobalProvider, getGlobalProvider, removeGlobalProvider } from "./default";
import { Network } from "../interface";
import { networkTickerMap } from "./constant";
import { prefixFromNetworkMap } from "../enum";
import { CashAddressNetworkPrefix } from "@bitauth/libauth";

async function initProvider(network: Network) {
  const ticker = networkTickerMap[network];
  if (!getGlobalProvider(network)) {
    try {
      const conn = new Connection(network);
      const provider = (await conn.ready()).networkProvider;
      setGlobalProvider(network, provider);
      return provider;
    } catch (e) {
      throw `${network} ${e}`;
    }
  } else {
    console.warn(
      `Ignoring attempt to reinitialize non-existent ${network} provider`
    );
    return true;
  }
}

export async function initProviders(networks?: Network[]) {
  networks = networks ? networks : (Object.keys(networkTickerMap) as Network[]);
  let initPromises = networks.map((n) => initProvider(n));
  await Promise.all(initPromises).catch((e) => {
    console.warn(`Warning, couldn't establish a connection for ${e}`);
  });
}

async function disconnectProvider(network: Network) {
  const provider = getGlobalProvider(network);
  if (provider) {
    await provider.disconnect();
    removeGlobalProvider(network);
    return;
  } else {
    console.warn(
      `Ignoring attempt to disconnect non-existent ${network} provider`
    );
    return true;
  }
}

export async function disconnectProviders(networks?: Network[]) {
  networks = networks ? networks : (Object.keys(networkTickerMap) as Network[]);
  let disconnectPromises = networks.map((n) => disconnectProvider(n));
  await Promise.all(disconnectPromises);
}

export class Connection {
  public network: Network;
  public servers?: string[];
  public networkPrefix: CashAddressNetworkPrefix;
  public networkProvider: NetworkProvider;

  constructor(network?: Network, servers?: string[] | string) {
    this.network = network ? network : "mainnet";
    this.networkPrefix = prefixFromNetworkMap[this.network];
    this.networkProvider = getNetworkProvider(this.network, servers, true);
  }

  public async ready() {
    await this.networkProvider.connect();
    await this.networkProvider.ready();
    return this;
  }

  public async disconnect() {
    await this.networkProvider.disconnect();
    return this;
  }
}
