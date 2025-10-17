import { binToBase64, utf8ToBin } from "@bitauth/libauth";

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
  const response = await fetch(`http://127.0.0.1:${process.env.RPC_PORT}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " +
        binToBase64(
          utf8ToBin(`${process.env.RPC_USER}:${process.env.RPC_PASS}`)
        ),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "0",
      method: "generatetoaddress",
      params: {
        nblocks: blocks,
        address: cashaddr,
      },
    }),
  });
  const json = await response.json();

  return json.result;
};
