const { spawnSync } = require("child_process");

export function generateBlocks({
  cashaddr,
  blocks,
}: {
  cashaddr: string;
  blocks: number;
}) {
  const generateArgs = [
    `exec`,
    `regtest`,
    `bitcoin-cli`,
    `--rpcuser=${process.env.RPC_USER}`,
    `--rpcpassword=${process.env.RPC_PASS}`,
    `--rpcport=${process.env.PORT}`,
    `generatetoaddress`,
    cashaddr,
    blocks,
  ];

  const cli = spawnSync(`docker`, generateArgs);
  if (cli.stderr.length > 0) {
    return console.log(cli.stderr.toString());
  }
  return JSON.parse(cli.stdout.toString());
}
