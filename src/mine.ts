const { spawnSync } = require("child_process");

export function mine({
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
    `--rpcport=${process.env.RPC_PORT}`,
    `generatetoaddress`,
    blocks,
    cashaddr,
  ];

  const cli = spawnSync(`docker`, generateArgs);
  if (cli.stderr.length > 0) {
    return console.log("Mine Error: " + cli.stderr.toString());
  }
  return JSON.parse(cli.stdout.toString());
}
