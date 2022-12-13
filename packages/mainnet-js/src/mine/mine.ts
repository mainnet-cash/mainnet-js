import { browserNotSupported } from "../util/browserNotSupported.js";
/**
 * Mine blocks to a regtest address
 *
 * @param cashaddr - the address to mine to
 * @param blocks - the number of blocks to mine
 *
 * @remarks
 * This function assumes a local regtest bitcoin node with RPC_* matching the docker configuration
 */

export async function mine({
  cashaddr,
  blocks,
}: {
  cashaddr: string;
  blocks: number;
}) {
  // node only
  browserNotSupported();

  const generateArgs = [
    `exec`,
    `bitcoind`,
    `bitcoin-cli`,
    `--rpcconnect=${process.env.RPC_HOST}`,
    `--rpcuser=${process.env.RPC_USER}`,
    `--rpcpassword=${process.env.RPC_PASS}`,
    `--rpcport=${process.env.RPC_PORT}`,
    `generatetoaddress`,
    blocks,
    cashaddr,
  ];
  const cli = (await import("child_process")).spawnSync(
    `docker`,
    generateArgs as any
  );
  if (cli.stderr.length > 0) {
    return console.log("Mine Error: " + cli.stderr.toString());
  }
  return JSON.parse(cli.stdout.toString());
}
