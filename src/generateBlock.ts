require('dotenv').config()
const { spawnSync } = require('child_process');


export function generateBlock(blockHeight): String[] {
    const bchctlArgs = [`--testnet`,
        `--rpcuser=${process.env.REGTEST_USER}`,
        `--rpcpass=${process.env.REGTEST_PASS}`,
        `generate`,
        blockHeight
    ]
    const bchctl = spawnSync(`${process.env.BCHD_BIN_DIRECTORY}/bchctl`, bchctlArgs);
    return JSON.parse(bchctl.stdout.toString())
}
