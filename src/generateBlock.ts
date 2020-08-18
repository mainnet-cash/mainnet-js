require("dotenv").config();
const { spawnSync } = require("child_process");

export function generateBlock(numberOfBlocks): string[] {
  const bchctlArgs = [
    `--testnet`,
    `--rpcuser=${process.env.REGTEST_USER}`,
    `--rpcpass=${process.env.REGTEST_PASS}`,
    `generate`,
    `--skipverify`,
    numberOfBlocks,
  ];
  const bchctl = spawnSync(
    `${process.env.BCHD_BIN_DIRECTORY}/bchctl`,
    bchctlArgs
  );
  if(bchctl.stderr.length > 0){
    throw new Error(bchctl.stderr.toString())
  }
  return JSON.parse(bchctl.stdout.toString());

}
