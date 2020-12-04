import { default as NetworkProvider } from "./NetworkProvider";
import { getNetworkProvider } from "./default";
import { Network } from "../interface";
import { Wallet } from "../wallet/Wif";
import { walletClassMap } from "../wallet/createWallet";
import { prefixFromNetworkMap } from "../enum";
import { CashAddressNetworkPrefix } from "@bitauth/libauth";


export async function initProviders(){
  globalThis.BCH = new Connection()
  await globalThis.BCH.ready()
  globalThis.BCHt = new Connection("testnet")
  await globalThis.BCHt.ready()
  globalThis.BCHr = new Connection("regtest")
  await globalThis.BCHr.ready()
}

export async function disconnectProviders(){
  await globalThis.BCH.disconnect()
  await globalThis.BCHt.disconnect()
  await globalThis.BCHr.disconnect()
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
    try {
      await this.networkProvider.connect();
      await this.networkProvider.ready();
    } catch (e) {
      throw Error(e);
    }
  }

  public async disconnect() {
    try {
      await this.networkProvider.disconnect();
    } catch (e) {
      throw Error(e);
    }
  }
  
}
