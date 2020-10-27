import {
  ElectrumCluster,
  ElectrumTransport,
  ClusterOrder,
  RequestResponse,
} from "electrum-cash";
import NetworkProvider from "./NetworkProvider";
import { Utxo, Network, ElectrumBalance } from "../interface";

export default class ElectrumNetworkProvider implements NetworkProvider {
  private electrum: ElectrumCluster;
  private concurrentRequests: number = 0;

  constructor(
    public network: Network = Network.MAINNET,
    electrum?: ElectrumCluster,
    private manualConnectionManagement?: boolean
  ) {
    // If a custom Electrum Cluster is passed, we use it instead of the default.
    if (electrum) {
      this.electrum = electrum;
      return;
    }

    if (network === Network.MAINNET) {
      // Initialize a 2-of-3 Electrum Cluster with 6 reliable hardcoded servers
      // using the first three servers as "priority" servers
      this.electrum = new ElectrumCluster(
        "Mainnet",
        "1.4.1",
        2,
        3,
        ClusterOrder.PRIORITY,
        550
      );
      this.electrum.addServer(
        "fulcrum.fountainhead.cash",
        50002,
        ElectrumTransport.TCP_TLS.Scheme,
        false
      );
      this.electrum.addServer(
        "bch.imaginary.cash",
        50002,
        ElectrumTransport.TCP_TLS.Scheme,
        false
      );
      this.electrum.addServer(
        "electrum.imaginary.cash",
        50002,
        ElectrumTransport.TCP_TLS.Scheme,
        false
      );
      this.electrum.addServer(
        "blackie.c3-soft.com",
        50002,
        ElectrumTransport.TCP_TLS.Scheme,
        false
      );
      this.electrum.addServer(
        "bch.imaginary.cash",
        50004,
        ElectrumTransport.WSS.Scheme,
        false
      );
      this.electrum.addServer(
        "blackie.c3-soft.com",
        50004,
        ElectrumTransport.WSS.Scheme,
        false
      );
      this.electrum.addServer(
        "electroncash.de",
        60002,
        ElectrumTransport.WSS.Scheme,
        false
      );
      this.electrum.addServer(
        "electroncash.dk",
        50004,
        ElectrumTransport.WSS.Scheme,
        false
      );
      this.electrum.addServer(
        "bch.loping.net",
        50004,
        ElectrumTransport.WSS.Scheme,
        false
      );
      this.electrum.addServer(
        "electrum.imaginary.cash",
        50004,
        ElectrumTransport.WSS.Scheme,
        false
      );
    } else if (network === Network.TESTNET) {
      // Initialize a 1-of-2 Electrum Cluster with 2 hardcoded servers
      this.electrum = new ElectrumCluster(
        "CashScript Application",
        "1.4.1",
        1,
        1,
        undefined
      );
      this.electrum.addServer(
        "blackie.c3-soft.com",
        60004,
        ElectrumTransport.WSS.Scheme,
        false
      );
      this.electrum.addServer(
        "electroncash.de",
        60004,
        ElectrumTransport.WSS.Scheme,
        false
      );
    } else if (network === Network.REGTEST) {
      //
      this.electrum = new ElectrumCluster(
        "CashScript Application",
        "1.4.1",
        1,
        1,
        ClusterOrder.RANDOM,
        1020
      );
      this.electrum.addServer(
        "127.0.0.1",
        60003,
        ElectrumTransport.WS.Scheme,
        false
      );
    } else {
      throw new Error(
        `Tried to instantiate an ElectrumNetworkProvider for unknown network: ${network}`
      );
    }
  }

  async getUtxos(address: string): Promise<Utxo[]> {
    const result = (await this.performRequest(
      "blockchain.address.listunspent",
      address
    )) as ElectrumUtxo[];

    const utxos = result.map((utxo) => ({
      txid: utxo.tx_hash,
      vout: utxo.tx_pos,
      satoshis: utxo.value,
      height: utxo.height,
    }));

    return utxos;
  }

  async getBalance(address: string): Promise<number> {
    const result = (await this.performRequest(
      "blockchain.address.get_balance",
      address
    )) as ElectrumBalance;

    return result.confirmed + result.unconfirmed;
  }

  async getBlockHeight(): Promise<number> {
    const { height } = (await this.performRequest(
      "blockchain.headers.subscribe"
    )) as BlockHeader;

    return height;
  }

  async getRawTransaction(txid: string): Promise<string> {
    return (await this.performRequest(
      "blockchain.transaction.get",
      txid
    )) as string;
  }

  async sendRawTransaction(txHex: string): Promise<string> {
    return (await this.performRequest(
      "blockchain.transaction.broadcast",
      txHex
    )) as string;
  }

  async connectCluster(): Promise<boolean[]> {
    try {
      return await this.electrum.startup();
    } catch (e) {
      return [];
    }
  }

  async disconnectCluster(): Promise<boolean[]> {
    return this.electrum.shutdown();
  }

  private async performRequest(
    name: string,
    ...parameters: (string | number | boolean)[]
  ): Promise<RequestResponse> {
    // Only connect the cluster when no concurrent requests are running
    if (this.shouldConnect()) {
      this.connectCluster();
    }

    this.concurrentRequests += 1;

    await this.electrum.ready();

    let result;
    try {
      result = await this.electrum.request(name, ...parameters);
    } finally {
      // Always disconnect the cluster, also if the request fails
      if (this.shouldDisconnect()) {
        await this.disconnectCluster();
      }
    }

    this.concurrentRequests -= 1;

    if (result instanceof Error) throw result;

    return result;
  }

  private shouldConnect(): boolean {
    if (this.manualConnectionManagement) return false;
    if (this.concurrentRequests !== 0) return false;
    return true;
  }

  private shouldDisconnect(): boolean {
    if (this.manualConnectionManagement) return false;
    if (this.concurrentRequests !== 1) return false;
    return true;
  }
}

interface ElectrumUtxo {
  tx_pos: number;
  value: number;
  tx_hash: string;
  height: number;
}

interface BlockHeader {
  height: number;
  hex: string;
}
