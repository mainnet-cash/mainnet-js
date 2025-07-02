import { ElectrumNetworkProvider, Utxo } from "cashscript";
import { TokenDetails } from "cashscript/dist/interfaces";
import {
  ElectrumNetworkProvider as MainnetElectrumNetworkProvider,
  Network,
  TokenI,
  UtxoI,
} from "mainnet-js";

export const toCashScript = (utxo: UtxoI) =>
  ({
    satoshis: BigInt(utxo.satoshis),
    txid: utxo.txid,
    vout: utxo.vout,
    token: utxo.token
      ? ({
          amount: utxo.token?.amount ? BigInt(utxo.token.amount) : 0n,
          category: utxo.token?.tokenId,
          nft:
            utxo.token?.capability || utxo.token?.commitment
              ? ({
                  capability: utxo.token?.capability,
                  commitment: utxo.token?.commitment,
                } as TokenDetails["nft"])
              : undefined,
        } as TokenDetails)
      : undefined,
  } as Utxo);

export const toMainnet = (utxo: Utxo) =>
  ({
    satoshis: Number(utxo.satoshis),
    txid: utxo.txid,
    vout: utxo.vout,
    token: utxo.token
      ? ({
          amount: utxo.token?.amount ? BigInt(utxo.token?.amount) : undefined,
          tokenId: utxo.token?.category,
          capability: utxo.token?.nft?.capability as any,
          commitment: utxo.token?.nft?.commitment,
        } as TokenI)
      : undefined,
  } as UtxoI);

export default class WrappedProvider extends ElectrumNetworkProvider {
  constructor(public mainnetProvider: MainnetElectrumNetworkProvider) {
    super(
      mainnetProvider.network === Network.TESTNET
        ? "chipnet"
        : (mainnetProvider.network as any),
      {
        electrum: mainnetProvider.electrum as any,
        manualConnectionManagement: false,
      }
    );

    (this as any).performRequest = async (
      name: string,
      ...parameters: (string | number | boolean)[]
    ): Promise<any> => {
      return (this.mainnetProvider as any).performRequest(name, ...parameters);
    };
  }

  /**
   * Retrieve all UTXOs (confirmed and unconfirmed) for a given address.
   * @param address The CashAddress for which we wish to retrieve UTXOs.
   * @returns List of UTXOs spendable by the provided address.
   */
  async getUtxos(address: string): Promise<Utxo[]> {
    return (await this.mainnetProvider.getUtxos(address)).map(toCashScript);
  }
}
