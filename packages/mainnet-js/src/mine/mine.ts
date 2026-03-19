import { binToBase64, utf8ToBin } from "@bitauth/libauth";
import { http } from "@rpckit/http";
import { fallback } from "@rpckit/fallback";
import type { Transport } from "@rpckit/core";

/**
 * Mine blocks to a regtest address
 *
 * @param cashaddr - the address to mine to
 * @param blocks - the number of blocks to mine
 *
 * @remarks
 * This function assumes a local regtest bitcoin node with RPC_* matching the docker configuration
 */
export const mine = async ({
  cashaddr,
  blocks,
}: {
  cashaddr: string;
  blocks: number;
}): Promise<any> => {
  const auth =
    "Basic " +
    binToBase64(
      utf8ToBin(`${process.env.RPC_USER}:${process.env.RPC_PASS}`)
    );

  const transports = ["127.0.0.1", "host.docker.internal"].map((host) =>
    http(`http://${host}:${process.env.RPC_PORT}/`, {
      headers: { Authorization: auth },
    })
  ) as [Transport, Transport];

  const transport = fallback(transports);
  try {
    return await transport.request("generatetoaddress", blocks, cashaddr);
  } finally {
    await transport.close();
  }
};
