require("dotenv").config();
const { spawnSync } = require("child_process");

export function generateBlock(
  user: string,
  password: string,
  numberOfBlocks: number
): string[] {

  const bchctlArgs = [
    `--testnet`,
    `--rpcuser=${user}`,
    `--rpcpass=${password}`,
    `generate`,
    `--skipverify`,
    numberOfBlocks,
  ];
  const bchctl = spawnSync(
    `${process.env.BCHD_BIN_DIRECTORY}/bchctl`,
    bchctlArgs
  );
  if (bchctl.stderr.length > 0) {
    throw Error(bchctl.stderr.toString())
  }
  return JSON.parse(bchctl.stdout.toString());

}
