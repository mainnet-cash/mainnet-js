const { spawnSync } = require("child_process");

export function generateBlock(
  user: string,
  password: string,
  numberOfBlocks: number,
  binDir: string
): string[] {
  const bchctlArgs = [
    `--testnet`,
    `--rpcuser=${user}`,
    `--rpcpass=${password}`,
    `generate`,
    `--skipverify`,
    numberOfBlocks,
  ];
  const bchctl = spawnSync(`${binDir}/bchctl`, bchctlArgs);
  if (bchctl.stderr.length > 0) {
    throw Error(bchctl.stderr.toString());
  }
  return JSON.parse(bchctl.stdout.toString());
}
