import { Network } from "../interface.js";
import { getNetworkProvider } from "../network/default.js";

/**
 * Mine blocks to a regtest address.
 * Delegates to the network provider's mine() implementation.
 */
export const mine = async ({
  cashaddr,
  blocks,
}: {
  cashaddr: string;
  blocks: number;
}): Promise<any> => {
  const provider = getNetworkProvider(Network.REGTEST);
  return provider.mine(cashaddr, blocks);
};
