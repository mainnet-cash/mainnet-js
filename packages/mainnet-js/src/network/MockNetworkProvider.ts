import type {
  ElectrumCashTestSchema,
  Indexer,
  IndexerConfig,
} from "@mem-cash/electrum";
import { asTransport, createIndexer } from "@mem-cash/electrum";
import { Network, Utxo } from "../interface.js";
import ElectrumNetworkProvider from "./ElectrumNetworkProvider.js";

export interface MockNetworkProviderOptions {
  /** Indexer config passed to createIndexer. */
  indexerConfig?: Partial<IndexerConfig>;
}

/**
 * In-memory NetworkProvider backed by @mem-cash/electrum.
 *
 * Inherits all Electrum protocol handling from ElectrumNetworkProvider.
 * Only adds test helpers (addUtxo, mine, setBlockHeight, reset) and
 * overrides mine() to use test.mine instead of daemon.passthrough.
 */
export class MockNetworkProvider extends ElectrumNetworkProvider<ElectrumCashTestSchema> {
  /** The backing Indexer instance (extends Node). */
  public mc: Indexer;
  private connPromise?: Promise<void>;
  constructor(options?: MockNetworkProviderOptions) {
    const mc = createIndexer({
      addressPrefix: "bchreg",
      ...options?.indexerConfig,
    });
    // IndexerTransport and rpckit Transport are structurally identical
    // but TypeScript sees distinct ExtractParams types across packages.
    super(asTransport(mc) as any, Network.REGTEST);
    this.mc = mc;
  }

  override async connect(): Promise<void> {
    if (!this.connPromise) {
      this.connPromise = this.doInit();
    }
    return this.connPromise;
  }

  private async doInit(): Promise<void> {
    // set_chain_tip creates headers for max(0, h-10)..h only (11 headers).
    // Fill headers for heights 0..189 so that UTXOs placed at lower heights
    // have matching block headers for verbose transaction lookups.
    for (let h = 0; h < 190; h++) {
      const hash = h.toString(16).padStart(64, "0");
      await this.mc.request("test.add_header", [hash, h, 1700000000 + h]);
    }
    await this.mc.request("test.set_chain_tip", [200, 1700000200]);
  }

  // --- Test helpers ---

  async addUtxo(address: string, utxo: Omit<Utxo, "address">): Promise<void> {
    await this.ready();
    await this.mc.request("test.add_utxo", [address, utxo]);
  }

  override async mine(cashaddr: string, blocks: number): Promise<string[]> {
    await this.ready();
    const result = (await this.mc.request("test.mine", [cashaddr, blocks])) as {
      height: number;
      coinbaseTxids: string[];
    };
    return result.coinbaseTxids;
  }

  async setBlockHeight(height: number): Promise<void> {
    await this.ready();
    await this.mc.request("test.set_chain_tip", [height, 1700000000]);
  }

  async reset(): Promise<void> {
    await this.ready();
    await this.mc.request("test.reset", []);
    await this.mc.request("test.set_chain_tip", [200, 1700000000]);
  }

  async seedAlice(): Promise<void> {
    const address = process.env.ADDRESS;
    if (!address) return;
    await this.ready();
    for (let i = 0; i < 110; i++) {
      await this.mc.request("test.add_utxo", [
        address,
        {
          vout: 0,
          satoshis: 5_000_000_000,
          height: i + 1,
        },
      ]);
    }
  }
}
