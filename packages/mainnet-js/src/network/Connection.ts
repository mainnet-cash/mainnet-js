import { default as NetworkProvider } from "./NetworkProvider.js";
import {
  getNetworkProvider,
  setGlobalProvider,
  getGlobalProvider,
  removeGlobalProvider,
} from "./default.js";
import { Network } from "../interface.js";
import { networkTickerMap } from "./constant.js";
import { prefixFromNetworkMap } from "../enum.js";
import { CashAddressNetworkPrefix } from "@bitauth/libauth";

export async function initProvider(network: Network) {
  if (!getGlobalProvider(network)) {
    const conn = new Connection(network);
    const provider = (await conn.ready()).networkProvider;
    setGlobalProvider(network, provider);
    return provider;
  }
  return getGlobalProvider(network);
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
    // console.warn(
    //   `Ignoring attempt to disconnect non-existent ${network} provider`
    // );
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
