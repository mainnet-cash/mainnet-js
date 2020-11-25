import { default as NetworkProvider } from "./NetworkProvider";
import { getNetworkProvider } from "./default";
import { Network } from "../interface";
import { Wallet } from "../wallet/Wif";
import { walletClassMap } from "../wallet/createWallet";
import { prefixFromNetworkMap } from "../enum";
import { CashAddressNetworkPrefix } from "@bitauth/libauth";

export function connect(
  servers: string[] | string,
  network: Network = Network.MAINNET
) {
  globalThis["bch"] = new Connection(network,servers);
  globalThis["bch"].ready();
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

  public async Wallet(name = ""): Promise<Wallet> {
    let walletClass = walletClassMap["wif"][this.network]();
    let wallet = new walletClass(name);
    let walletResult = await wallet.generate();
    if (walletResult instanceof Error) {
      throw walletResult;
    } else {
      walletResult.provider = this.networkProvider;
      return walletResult;
    }
  }
}
