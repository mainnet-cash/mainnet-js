import { getNetworkProvider } from "../network/default.js";
import { Network } from "../interface.js";
import ElectrumNetworkProvider from "../network/ElectrumNetworkProvider.js";

/**
 * Mine blocks to a regtest address
 *
 * @param cashaddr - the address to mine to
 * @param blocks - the number of blocks to mine
 *
 * @remarks
 * Uses the Electrum provider's daemon.passthrough to call generatetoaddress on the regtest node
 */
export const mine = async ({
  cashaddr,
  blocks,
}: {
  cashaddr: string;
  blocks: number;
}): Promise<any> => {
  const provider = getNetworkProvider(
    Network.REGTEST
  ) as ElectrumNetworkProvider;
  return provider.daemonPassthrough("generatetoaddress", [blocks, cashaddr]);
};
